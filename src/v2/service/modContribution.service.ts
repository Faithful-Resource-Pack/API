import { createHash } from "crypto";
import {
	CreationModContribution,
	Mod,
	ModMergedBody,
	ModMergedResult,
	ModMergedSkipped,
	ModTexture,
	ModVersion,
	Pack,
} from "../interfaces";
import { BadRequestError } from "../tools/errorTypes";
import {
	DEFAULT_PACK,
	PullRequestCommit,
	RepoFileChange,
	commitFiles,
	ensureBranch,
	getFileContent,
	getPullRequest,
	getPullRequestCommits,
	getPullRequestFiles,
} from "../tools/github";
import { JarTexture, jarPath } from "../tools/jar";
import { hashesOf } from "../tools/modTexture";
import { enqueueKeyed } from "../tools/queue";
import ModsService from "./mods.service";
import PackService from "./pack.service";

const sha256 = (data: Buffer) => createHash("sha256").update(data).digest("hex");

// <version folder>/assets/<namespace>/textures/<path>.png in a mod's branch
const BRANCH_FILE = /^([^/]+)\/(assets\/[^/]+\/textures\/.+\.png)$/;
const CO_AUTHOR = /^co-authored-by:.*<(?:\d+\+)?([^@>]+)@users\.noreply\.github\.com>/gim;

interface Repository {
	org: string;
	repo: string;
}

interface Location {
	version: ModVersion;
	branch: string; // mod slug
	file: string; // <version folder>/<jar path>
}

export default class ModContributionService {
	private readonly modsService = new ModsService();
	private readonly packService = new PackService();

	/**
	 * Index the textures changed by a merged pull request and copy them to every branch and folder
	 * using the same texture. Called by the CI of the pack repository once the pull request is merged,
	 * sending the same pull request twice does nothing.
	 */
	async registerMerged(body: ModMergedBody): Promise<ModMergedResult> {
		const prNumber = body.pr;
		if (body.pack === DEFAULT_PACK)
			throw new BadRequestError("The default pack only holds the original textures");
		const pack = await this.packService.getById(body.pack);
		const github = this.getRepository(pack);

		const pr = await getPullRequest(github.org, github.repo, prNumber);
		if (!pr.merged) throw new BadRequestError("This pull request isn't merged");

		const [mod] = await this.modsService.search({ slug: pr.base });
		if (!mod) throw new BadRequestError(`No mod uses the branch "${pr.base}"`);

		const [files, commits, versions] = await Promise.all([
			getPullRequestFiles(github.org, github.repo, prNumber),
			getPullRequestCommits(github.org, github.repo, prNumber),
			this.modsService.getVersions(mod.id),
		]);
		const authors = this.getAuthors(pr.author, commits);
		const date = pr.mergedAt ?? Date.now();

		const skipped: ModMergedSkipped[] = [];
		const created: CreationModContribution[] = [];
		const sources = new Map<string, { texture: ModTexture; content: Buffer; location: string }>();
		const byVersion = new Map<string, ModTexture[]>();

		for (const { path: filePath, status } of files) {
			if (status === "removed") continue;
			const skip = (reason: string) => skipped.push({ path: filePath, reason });

			const match = BRANCH_FILE.exec(filePath);
			if (!match) {
				skip("Not a texture inside a version folder");
				continue;
			}
			const [, folder, jarPath] = match;

			const version = versions.find((v) => v.version === folder);
			if (!version) {
				skip(`Mod has no version "${folder}"`);
				continue;
			}
			if (mod.blacklisted || version.blacklisted) {
				skip("This mod version doesn't accept contributions");
				continue;
			}

			if (!byVersion.has(version.id))
				byVersion.set(version.id, await this.modsService.getTexturesByVersion(version.id));
			const texture = byVersion
				.get(version.id)
				?.find((t) => t.paths[jarPath]?.includes(version.id));
			if (!texture) {
				skip("Not a texture of this version");
				continue;
			}
			if (texture.blacklisted) {
				skip("This texture doesn't accept contributions");
				continue;
			}

			const content = pr.mergeCommit
				? await getFileContent(github.org, github.repo, pr.mergeCommit, filePath)
				: null;
			if (!content) {
				skip("File not found in the merged pull request");
				continue;
			}
			if (hashesOf(texture).includes(sha256(content))) {
				skip("Same as the original texture");
				continue;
			}

			// the same texture can be changed in several folders of one pull request
			const known = await this.modsService.getTextureContributions([texture.id], { pack: pack.id });
			if (
				known.some((c) => c.pr === prNumber) ||
				created.some((c) => c.mod_texture_id === texture.id)
			)
				continue;

			created.push({ mod_texture_id: texture.id, pack: pack.id, pr: prNumber, authors, date });
			sources.set(texture.id, { texture, content, location: filePath });
		}

		const contributions = await this.modsService.addContributions(created);

		for (const { texture, content, location } of sources.values()) {
			try {
				await this.copyContribution(texture, pack, { content, except: location });
			} catch (err) {
				console.error(`Couldn't copy the contribution of mod texture ${texture.id}:`, err);
				skipped.push({
					path: location,
					reason: `Indexed but not copied to the other versions: ${err instanceof Error ? err.message : err}`,
				});
			}
		}
		return { contributions, skipped };
	}

	/**
	 * Write the contribution of a texture to every branch and folder using that texture,
	 * where the file is missing or different. The contributed file is read from the pull request
	 * when given, from a location already holding it otherwise.
	 * Used when a contribution is merged and when a version is imported.
	 * @param options.content The contributed file, if known
	 * @param options.except File not to read from nor write to (where the contribution was made)
	 * @param options.versionIds Only write to these mod versions
	 */
	async copyContribution(
		texture: ModTexture,
		pack: Pack,
		options: { content?: Buffer; except?: string; versionIds?: Set<string> } = {},
	): Promise<void> {
		const github = this.getRepository(pack);
		const locations = await this.getLocations(texture);

		let content = options.content;
		if (!content) {
			// any location that isn't the original texture has the latest contribution
			for (const { version, branch, file } of locations) {
				if (options.versionIds?.has(version.id)) continue;
				const found = await getFileContent(github.org, github.repo, branch, file);
				if (found && !hashesOf(texture).includes(sha256(found))) {
					content = found;
					break;
				}
			}
		}
		if (!content) return;

		const targets = locations.filter(
			({ version, file }) =>
				file !== options.except && (!options.versionIds || options.versionIds.has(version.id)),
		);
		const byBranch = new Map<string, Location[]>();
		for (const target of targets)
			byBranch.set(target.branch, [...(byBranch.get(target.branch) ?? []), target]);

		const data = content;
		await enqueueKeyed(`${github.org}/${github.repo}`, async () => {
			for (const [branch, branchTargets] of byBranch) {
				await ensureBranch(github.org, github.repo, branch);

				const changes: RepoFileChange[] = [];
				for (const { file } of branchTargets) {
					const existing = await getFileContent(github.org, github.repo, branch, file);
					if (!existing?.equals(data)) changes.push({ path: file, content: data });
				}
				if (!changes.length) continue;
				await commitFiles(
					github.org,
					github.repo,
					branch,
					changes,
					`Copy contribution to ${changes.map((c) => c.path.split("/")[0]).join(", ")}`,
				);
			}
		});
	}

	/**
	 * Copy the existing contributions of the textures of a newly imported mod version into its folder,
	 * for every pack that has some
	 */
	async copyForVersion(version: ModVersion): Promise<void> {
		const textures = await this.modsService.getTexturesByVersion(version.id);
		const contributions = await this.modsService.getTextureContributions(textures.map((t) => t.id));
		if (!contributions.length) return;

		const packs = new Map<string, Pack | null>();
		const done = new Set<string>();
		for (const { mod_texture_id, pack: packId } of contributions) {
			const key = `${mod_texture_id}/${packId}`;
			if (done.has(key)) continue;
			done.add(key);

			if (!packs.has(packId))
				packs.set(packId, await this.packService.getById(packId).catch(() => null));
			const pack = packs.get(packId);
			const texture = textures.find((t) => t.id === mod_texture_id);
			if (!pack?.github.modded?.repo || !texture) continue;

			await this.copyContribution(texture, pack, { versionIds: new Set([version.id]) });
		}
	}

	/**
	 * Write the original textures of a mod version (and their .mcmeta) to its folder in the default pack's
	 * repository. Does nothing if the folder is already there, so importing a version again is harmless.
	 */
	async pushDefaultTextures(mod: Mod, version: ModVersion, textures: JarTexture[]): Promise<void> {
		if (!textures.length) return;
		const github = this.getRepository(await this.packService.getById(DEFAULT_PACK));

		const changes: RepoFileChange[] = textures.flatMap((t) => {
			const path = `${version.version}/${jarPath(t.namespace, t.path)}`;
			return [
				{ path, content: t.png },
				...(t.mcmeta ? [{ path: `${path}.mcmeta`, content: t.mcmeta }] : []),
			];
		});

		await enqueueKeyed(`${github.org}/${github.repo}`, async () => {
			await ensureBranch(github.org, github.repo, mod.slug);
			const first = changes[0];
			const existing = await getFileContent(github.org, github.repo, mod.slug, first.path);
			if (first.content && existing?.equals(first.content)) return;
			await commitFiles(
				github.org,
				github.repo,
				mod.slug,
				changes,
				`Add ${mod.name} ${version.version}`,
			);
		});
	}

	/**
	 * Create the branch of a mod, empty, in the modded repository of every pack accepting contributions,
	 * so contributors can target it with a pull request as soon as the mod is imported.
	 * A pack that fails doesn't stop the others.
	 */
	async createBranches(mod: Mod): Promise<void> {
		const packs = Object.values(await this.packService.getRaw()).filter(
			(pack) => pack.id !== DEFAULT_PACK && pack.github.modded?.repo,
		);

		await Promise.all(
			packs.map(async (pack) => {
				const github = this.getRepository(pack);
				try {
					await enqueueKeyed(`${github.org}/${github.repo}`, () =>
						ensureBranch(github.org, github.repo, mod.slug),
					);
				} catch (err) {
					console.error(`Couldn't create the branch ${mod.slug} of pack ${pack.id}:`, err);
				}
			}),
		);
	}

	/**
	 * Remove a contribution from the index. The files stay in the repository, nothing
	 * copies them again since only indexed contributions are carried over.
	 */
	async remove(id: string): Promise<void> {
		await this.modsService.getContributionById(id);
		await this.modsService.removeContributions([id]);
	}

	/** Every branch and file the texture is used at */
	private async getLocations(texture: ModTexture): Promise<Location[]> {
		const [versions, mods] = await Promise.all([
			this.modsService.getAllVersions(),
			this.modsService.getRaw(),
		]);
		const byId = new Map(versions.map((v) => [v.id, v]));

		return Object.entries(texture.paths).flatMap(([jarPath, ids]) =>
			ids.flatMap((id) => {
				const version = byId.get(id);
				const mod = version && mods[version.mod_id];
				if (!version || !mod || mod.blacklisted || version.blacklisted) return [];
				return { version, branch: mod.slug, file: `${version.version}/${jarPath}` };
			}),
		);
	}

	/** GitHub repository of a pack's modded textures */
	private getRepository(pack: Pack): Repository {
		const github = pack.github.modded;
		if (!github?.repo) throw new BadRequestError(`Pack "${pack.id}" has no modded repository`);
		return { org: github.org, repo: github.repo };
	}

	/** Pull request author and commit authors, without bots */
	private getAuthors(author: string, commits: PullRequestCommit[]): string[] {
		const logins = new Set([author]);
		for (const commit of commits) {
			if (commit.author) logins.add(commit.author);
			for (const [, login] of commit.message.matchAll(CO_AUTHOR)) logins.add(login);
		}
		return [...logins].filter((login) => !login.endsWith("[bot]"));
	}
}

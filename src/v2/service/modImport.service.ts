import axios from "axios";
import { createHash } from "crypto";
import {
	ImportModBody,
	ImportModResult,
	Mod,
	MCMETA,
	ModLoader,
	ModPlatform,
	ModTexture,
	ModVersion,
} from "../interfaces";
import { BadRequestError } from "../tools/errorTypes";
import { JarTexture, extractJarTextures, jarPath, pngSize } from "../tools/jar";
import { PlatformFile, PlatformProject, PlatformSearchResult, platforms } from "../tools/platforms";
import { hashesOf } from "../tools/modTexture";
import { enqueue } from "../tools/queue";
import { DEFAULT_VERSION_VALIDATOR, MOD_LOADERS, SAFE_VERSION } from "../tools/semver";
import ModContributionService from "./modContribution.service";
import ModsService from "./mods.service";

// jars can only be downloaded from the platforms' own cdns
const ALLOWED_HOSTS = ["cdn.modrinth.com", "edge.forgecdn.net", "mediafilez.forgecdn.net"];
// platforms list loaders we have no use for (ex: bukkit)
const toLoaders = (loaders: string[]) =>
	loaders.filter((l): l is ModLoader => MOD_LOADERS.includes(l));
const MAX_JAR_SIZE = 200 * 1024 * 1024;

const sha256 = (data: Buffer | string) => createHash("sha256").update(data).digest("hex");
const sha1 = (data: Buffer) => createHash("sha1").update(data).digest("hex");

const PROJECT_URL = /(?:curseforge\.com\/minecraft\/mc-mods|modrinth\.com\/mod)\/([^/?#]+)/i;

/** Id or slug to look up directly: either the query itself or the end of a project url */
function directQuery(query: string): string | null {
	const trimmed = query.trim();
	const fromUrl = PROJECT_URL.exec(trimmed)?.[1];
	if (fromUrl) return fromUrl;
	return /\s/.test(trimmed) ? null : trimmed;
}

export default class ModImportService {
	private readonly modsService = new ModsService();
	private readonly contributionService = new ModContributionService();

	/**
	 * Search a query on every platform at once. Exact ids, slugs and project urls are
	 * looked up directly and shown first, since text search can bury them.
	 */
	async search(query: string): Promise<PlatformSearchResult> {
		const direct = directQuery(query);
		const entries = Object.entries(platforms);

		const settled = await Promise.allSettled(
			entries.map(async ([, client]) => {
				const [found, matches] = await Promise.all([
					direct ? client.lookup(direct).catch(() => null) : null,
					client.search(query),
				]);
				return found ? [{ ...found, exact: true }, ...matches] : matches;
			}),
		);

		const errors: string[] = [];
		const seen = new Set<string>();
		const results: PlatformProject[] = [];
		settled.forEach((r, i) => {
			if (r.status === "rejected") {
				console.error(`Searching ${entries[i][0]} failed:`, r.reason?.message ?? r.reason);
				errors.push(entries[i][0]);
				return;
			}
			for (const project of r.value) {
				const key = `${project.platform}:${project.project_id}`;
				if (seen.has(key)) continue;
				seen.add(key);
				results.push(project);
			}
		});
		return { results, errors };
	}

	/**
	 * Get every file of a platform project, used to pick the versions to import
	 */
	getPlatformFiles(platform: ModPlatform, projectId: string): Promise<PlatformFile[]> {
		return platforms[platform].getFiles(projectId);
	}

	/**
	 * Create the mod and its versions, then queue the extraction of each new version
	 */
	async importMod(body: ImportModBody): Promise<ImportModResult> {
		const { platform, project_id, file_ids, versions: manualVersions = {} } = body;
		if (!file_ids.length && !body.mod_id) throw new BadRequestError("No file to import");

		const client = platforms[platform];
		const project = await client.getProject(project_id);

		// no files: only attach the platform project to the existing mod
		if (!file_ids.length) return { mod: await this.findOrCreateMod(body, project), versions: [] };

		const files = await Promise.all(file_ids.map((id) => client.getFile(project_id, id)));

		// validate everything before writing anything
		const known = await this.findMod(body, project);
		const validator = new RegExp(known?.version_validator ?? DEFAULT_VERSION_VALIDATOR);
		const resolved = files.map((file) => {
			const version = manualVersions[file.file_id] ?? file.version;
			if (!version) return { file, version: null };
			if (!SAFE_VERSION.test(version) || !validator.test(version))
				throw new BadRequestError(
					`Version "${version}" doesn't match the version format of ${known?.name ?? project.name}`,
				);
			return { file, version };
		});
		const unresolved = resolved.filter((r) => !r.version).map((r) => r.file.file_id);
		if (unresolved.length)
			throw new BadRequestError(
				`Version can't be converted to semver for file(s) ${unresolved.join(", ")}, provide it in "versions"`,
			);

		const mod = await this.findOrCreateMod(body, project);
		const existing = await this.modsService.getVersions(mod.id);

		const out: ModVersion[] = [];
		for (const { file, version } of resolved) {
			const found = existing.find((v) => v.version === version);
			// same version already imported (ex: other loader): the first import wins,
			// only a version that never got its textures is extracted again
			if (found) {
				const merged = await this.modsService.updateVersion(found.id, {
					...found,
					minecraft: [...new Set([...found.minecraft, ...file.minecraft])],
					loaders: [...new Set([...found.loaders, ...toLoaders(file.loaders)])],
					source: [...new Set([...found.source, platform])],
				});
				if (found.status !== "extracted") this.enqueueExtraction(merged.id, file);
				out.push(merged);
				continue;
			}

			const created = await this.modsService.addVersion({
				mod_id: mod.id,
				version: version!,
				minecraft: file.minecraft,
				loaders: toLoaders(file.loaders),
				source: [platform],
				channel: file.channel,
				status: "pending",
				imported_at: Date.now(),
				blacklisted: false,
			});
			existing.push(created);
			this.enqueueExtraction(created.id, file);
			out.push(created);
		}

		return { mod, versions: out };
	}

	/** The mod a project belongs to, either the one asked for or the one already linked to it */
	private async findMod(body: ImportModBody, project: PlatformProject): Promise<Mod | undefined> {
		if (body.mod_id) return this.modsService.getById(body.mod_id);
		const all = Object.values(await this.modsService.getRaw());
		return all.find((m) => m.providers?.[project.platform] === project.project_id);
	}

	private async findOrCreateMod(body: ImportModBody, project: PlatformProject): Promise<Mod> {
		const found = await this.findMod(body, project);
		if (found) {
			if (found.providers?.[project.platform] === project.project_id) return found;
			return this.modsService.update(found.id, {
				...found,
				providers: { ...found.providers, [project.platform]: project.project_id },
			});
		}

		const all = Object.values(await this.modsService.getRaw());
		if (all.some((m) => m.slug === project.slug))
			throw new BadRequestError(
				`A mod with slug "${project.slug}" already exists, pass its id as "mod_id" to link this project to it`,
			);

		return this.modsService.add({
			name: project.name,
			slug: project.slug,
			aliases: [],
			version_validator: DEFAULT_VERSION_VALIDATOR,
			providers: { [project.platform]: project.project_id },
			icon: project.icon,
			blacklisted: false,
		});
	}

	private enqueueExtraction(modVersionId: string, file: PlatformFile) {
		enqueue(() => this.extract(modVersionId, file)).catch((err) =>
			console.error(`Extraction of mod version ${modVersionId} crashed:`, err),
		);
	}

	private async extract(modVersionId: string, file: PlatformFile): Promise<void> {
		let version = await this.modsService.getVersionById(modVersionId);
		const setState = async (patch: Partial<ModVersion>) => {
			version = await this.modsService.updateVersion(version.id, { ...version, ...patch });
		};

		try {
			if (!file.download_url)
				throw new Error("This file has no download url, a manual jar upload is required");

			await setState({ status: "extracting", error: undefined });
			const jar = await this.download(file.download_url, file.sha1);
			const entries = extractJarTextures(jar);
			if (!entries.length) throw new Error("No textures found in this jar");

			// the original textures are stored in the default pack's repository, the gallery reads them
			// from there, so nothing is registered before they are pushed
			const mod = await this.modsService.getById(version.mod_id);
			await this.contributionService.pushDefaultTextures(mod, version, entries);
			await this.contributionService.createBranches(mod);
			await this.registerTextures(entries, version.id);
			await setState({ status: "extracted" });

			// contributions already made on these textures are copied into the version's folder
			this.contributionService
				.copyForVersion(version)
				.catch((err) =>
					console.error(`Couldn't copy the contributions to mod version ${version.id}:`, err),
				);
		} catch (err) {
			await setState({
				status: "failed",
				error: err instanceof Error ? err.message : String(err),
			});
		}
	}

	private async download(url: string, expectedSha1?: string): Promise<Buffer> {
		const { hostname, protocol } = new URL(url);
		if (protocol !== "https:" || !ALLOWED_HOSTS.includes(hostname))
			throw new Error(`Download host ${hostname} isn't allowed`);

		const res = await axios.get<ArrayBuffer>(url, {
			responseType: "arraybuffer",
			maxContentLength: MAX_JAR_SIZE,
			maxRedirects: 3,
			beforeRedirect: (options) => {
				if (!ALLOWED_HOSTS.includes(options.hostname))
					throw new Error("Redirect host isn't allowed");
			},
		});
		const jar = Buffer.from(res.data);
		if (expectedSha1 && sha1(jar) !== expectedSha1.toLowerCase())
			throw new Error("Downloaded jar doesn't match the platform's checksum");
		return jar;
	}

	/**
	 * Register the textures of a jar for a mod version:
	 * known textures get the version added to their paths, the others are created
	 */
	private async registerTextures(entries: JarTexture[], versionId: string): Promise<void> {
		const known = new Map<string, ModTexture>();
		for (const t of Object.values(await this.modsService.getAllTextures()))
			for (const hash of hashesOf(t)) known.set(hash, t);

		// one texture per image, whatever the number of paths using it
		const touched = new Map<string, ModTexture>();
		const created = new Map<string, Omit<ModTexture, "id">>();

		for (const entry of entries) {
			const hash = sha256(entry.png);
			const path = jarPath(entry.namespace, entry.path);

			const existing = known.get(hash);
			if (existing) {
				const ids = existing.paths[path] ?? [];
				if (ids.includes(versionId)) continue;
				const texture = touched.get(existing.id) ?? { ...existing, paths: { ...existing.paths } };
				texture.paths[path] = [...ids, versionId];
				touched.set(existing.id, texture);
				continue;
			}

			const pending = created.get(hash);
			if (pending) {
				pending.paths[path] = [versionId];
				continue;
			}
			const size = pngSize(entry.png);
			created.set(hash, {
				hash,
				paths: { [path]: [versionId] },
				mcmeta: parseMcmeta(entry.mcmeta),
				width: size?.width ?? 0,
				height: size?.height ?? 0,
				animated: isAnimated(entry.mcmeta),
			});
		}

		await this.modsService.addTextures([...created.values()]);
		await this.modsService.updateTextures([...touched.values()]);
	}
}

function parseMcmeta(mcmeta?: Buffer): MCMETA | undefined {
	if (!mcmeta) return undefined;
	try {
		return JSON.parse(mcmeta.toString("utf8"));
	} catch {
		return undefined;
	}
}

function isAnimated(mcmeta?: Buffer): boolean {
	const parsed = parseMcmeta(mcmeta) as Record<string, unknown> | undefined;
	return !!parsed && "animation" in parsed;
}

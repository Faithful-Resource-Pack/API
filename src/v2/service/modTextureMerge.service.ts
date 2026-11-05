import {
	ModContribution,
	ModMergeCandidate,
	ModMergeTexture,
	ModTexture,
	ModTextureDistinctBody,
	ModTextureMergeBody,
	ModVersion,
} from "../interfaces";
import { BadRequestError } from "../tools/errorTypes";
import { fileName, hashesOf } from "../tools/modTexture";
import AuthService from "./auth.service";
import ModContributionService from "./modContribution.service";
import ModsService from "./mods.service";
import PackService from "./pack.service";

const unique = <T>(values: T[]): T[] => [...new Set(values)];

export default class ModTextureMergeService {
	private readonly modsService = new ModsService();
	private readonly contributionService = new ModContributionService();
	private readonly packService = new PackService();

	/**
	 * Textures of a mod version that have the same path as a different texture of the mod's other versions.
	 * Usually the same asset with a changed image, so an admin can decide to merge them.
	 */
	async getCandidates(versionId: string): Promise<ModMergeCandidate[]> {
		const version = await this.modsService.getVersionById(versionId);
		const versions = new Map(
			(await this.modsService.getVersions(version.mod_id)).map((v) => [v.id, v]),
		);
		const textures = Object.values(await this.modsService.getAllTextures());

		// textures of the other versions of the mod, by path
		const others = new Map<string, ModTexture[]>();
		for (const texture of textures)
			for (const [path, ids] of Object.entries(texture.paths))
				if (ids.some((id) => id !== version.id && versions.has(id)))
					others.set(path, [...(others.get(path) ?? []), texture]);

		const origin = new AuthService().targetToURL("api");
		const describe = (texture: ModTexture, versionIds: string[]): ModMergeTexture => ({
			texture,
			url: `${origin}/v2/mod-versions/${versionIds[0]}/textures/${texture.id}/image`,
			versions: this.versionNames(texture, versions),
		});

		const candidates: ModMergeCandidate[] = [];
		for (const texture of textures) {
			const paths = Object.entries(texture.paths)
				.filter(([, ids]) => ids.includes(version.id))
				.map(([path]) => path);
			if (!paths.length) continue;

			const matches = new Map<string, ModTexture>();
			for (const path of paths)
				for (const other of others.get(path) ?? [])
					if (other.id !== texture.id && !this.areDistinct(texture, other))
						matches.set(other.id, other);
			if (!matches.size) continue;

			candidates.push({
				path: paths[0],
				texture: describe(texture, [version.id]),
				matches: [...matches.values()].map((match) =>
					describe(
						match,
						unique(Object.values(match.paths).flat()).filter(
							(id) => versions.has(id) && id !== version.id,
						),
					),
				),
			});
		}
		return candidates.sort((a, b) => a.path.localeCompare(b.path));
	}

	/**
	 * Merge textures into the first one: it gets every path, every hash, the other names and the
	 * contributions of the others, which are removed. The contributions are then written to the
	 * folders of the versions that didn't have them.
	 */
	async merge({ ids }: ModTextureMergeBody): Promise<ModTexture> {
		const wanted = unique(ids);
		if (wanted.length < 2) throw new BadRequestError("At least two different textures are needed");

		const textures = await Promise.all(wanted.map((id) => this.modsService.getTextureById(id)));
		const [target, ...sources] = textures;

		const paths: Record<string, string[]> = {};
		for (const texture of textures)
			for (const [path, versionIds] of Object.entries(texture.paths))
				paths[path] = unique([...(paths[path] ?? []), ...versionIds]);

		// the other file names, the target's own names aren't aliases
		const own = new Set(Object.keys(target.paths).map(fileName));
		const aliases = unique([
			...textures.flatMap((t) => t.aliases ?? []),
			...sources.flatMap((t) => Object.keys(t.paths).map(fileName)),
		]).filter((alias) => !own.has(alias));

		// textures different from one of them are different from the merged one, but not from itself
		const mergedIds = new Set(textures.map((t) => t.id));
		const distinct = unique(textures.flatMap((t) => t.distinct_from ?? [])).filter(
			(id) => !mergedIds.has(id),
		);

		const merged: ModTexture = {
			...target,
			distinct_from: distinct.length ? distinct : undefined,
			paths,
			merged_hashes: unique(textures.flatMap(hashesOf)).filter((hash) => hash !== target.hash),
			aliases,
			vanilla_id: target.vanilla_id ?? sources.find((t) => t.vanilla_id !== undefined)?.vanilla_id,
			blacklisted: textures.some((t) => t.blacklisted) || undefined,
		};
		if (merged.vanilla_id === undefined) delete merged.vanilla_id;
		if (!merged.blacklisted) delete merged.blacklisted;
		if (!merged.distinct_from) delete merged.distinct_from;

		const sourceIds = sources.map((t) => t.id);
		const [targetContributions, sourceContributions] = await Promise.all([
			this.modsService.getTextureContributions([target.id]),
			this.modsService.getTextureContributions(sourceIds),
		]);

		// the same pull request can't be indexed twice for one texture
		const moved: ModContribution[] = [];
		const duplicates: string[] = [];
		for (const contribution of sourceContributions) {
			const known = [...targetContributions, ...moved].some(
				(c) => c.pack === contribution.pack && c.pr === contribution.pr,
			);
			if (known) duplicates.push(contribution.id);
			else moved.push({ ...contribution, mod_texture_id: target.id });
		}

		// the textures that were different from a merged one now point to the kept one
		const remapped = Object.values(await this.modsService.getAllTextures())
			.filter((t) => !mergedIds.has(t.id) && t.distinct_from?.some((id) => mergedIds.has(id)))
			.map((t) => ({
				...t,
				distinct_from: unique(t.distinct_from!.map((id) => (mergedIds.has(id) ? target.id : id))),
			}));

		await this.modsService.updateTextures([merged, ...remapped]);
		await this.modsService.updateContributions(moved);
		await this.modsService.removeContributions(duplicates);
		await this.modsService.removeTextures(sourceIds);

		this.spreadContributions(merged, target, sources, [...targetContributions, ...moved]).catch(
			(err) =>
				console.error(
					`Couldn't copy the contributions of the merged mod texture ${target.id}:`,
					err,
				),
		);
		return merged;
	}

	/**
	 * Remember that textures are different, so they aren't suggested for a merge again
	 */
	async setDistinct({ pairs }: ModTextureDistinctBody): Promise<void> {
		const links = new Map<string, Set<string>>();
		for (const { id, other } of pairs) {
			if (id === other) continue;
			links.set(id, (links.get(id) ?? new Set()).add(other));
			links.set(other, (links.get(other) ?? new Set()).add(id));
		}

		const textures = await Promise.all(
			[...links.keys()].map((id) => this.modsService.getTextureById(id)),
		);
		await this.modsService.updateTextures(
			textures.map((texture) => ({
				...texture,
				distinct_from: unique([...(texture.distinct_from ?? []), ...(links.get(texture.id) ?? [])]),
			})),
		);
	}

	private areDistinct(a: ModTexture, b: ModTexture): boolean {
		return !!a.distinct_from?.includes(b.id) || !!b.distinct_from?.includes(a.id);
	}

	/**
	 * Write the contributions of a merged texture to the folders that didn't have them: a pack that
	 * already contributed to the kept texture gets it on the merged ones, a pack that contributed to
	 * a merged texture only gets it on the kept texture's folders.
	 */
	private async spreadContributions(
		merged: ModTexture,
		target: ModTexture,
		sources: ModTexture[],
		contributions: ModContribution[],
	): Promise<void> {
		const idsOf = (textures: ModTexture[]) =>
			new Set(textures.flatMap((t) => Object.values(t.paths).flat()));
		const targetVersions = idsOf([target]);
		const sourceVersions = idsOf(sources);

		const targetPacks = new Set(
			contributions.filter((c) => c.mod_texture_id === target.id).map((c) => c.pack),
		);
		for (const packId of unique(contributions.map((c) => c.pack))) {
			const pack = await this.packService.getById(packId).catch(() => null);
			if (!pack?.github.modded?.repo) continue;
			await this.contributionService.copyContribution(merged, pack, {
				versionIds: targetPacks.has(packId) ? sourceVersions : targetVersions,
			});
		}
	}

	/** Names of the versions of a mod using a texture, sorted by import order */
	private versionNames(texture: ModTexture, versions: Map<string, ModVersion>): string[] {
		return unique(Object.values(texture.paths).flat())
			.map((id) => versions.get(id))
			.filter((v): v is ModVersion => !!v)
			.sort((a, b) => a.imported_at - b.imported_at)
			.map((v) => v.version);
	}
}

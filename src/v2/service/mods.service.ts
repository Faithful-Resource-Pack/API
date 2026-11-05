import {
	BlacklistBody,
	CreationMod,
	CreationModContribution,
	CreationModTexture,
	CreationModVersion,
	Mod,
	ModContribution,
	ModContributionSearch,
	ModRemoval,
	ModSearch,
	ModTexture,
	ModTextureAliasesBody,
	ModUpdateBody,
	ModVersion,
	ModVersionTexture,
	PickableMod,
} from "../interfaces";
import versionSorter from "../tools/versionSorter";
import { BadRequestError, NotFoundError } from "../tools/errorTypes";
import { DEFAULT_PACK, getFileContent } from "../tools/github";
import { parseJarPath } from "../tools/jar";
import AuthService from "./auth.service";
import ModpacksService from "./modpacks.service";
import PackService from "./pack.service";
import TextureService from "./texture.service";
import ContributionFirestormRepository from "../repository/contribution.repository";
import ModsFirestormRepository from "../repository/mods.repository";

export default class ModsService {
	private readonly modsRepo = new ModsFirestormRepository();

	getRaw(): Promise<Record<string, Mod>> {
		return this.modsRepo.getRaw();
	}

	getById(id: string): Promise<Mod> {
		return this.modsRepo.getById(id);
	}

	add(mod: CreationMod): Promise<Mod> {
		return this.modsRepo.add(mod);
	}

	update(id: string, mod: Mod): Promise<Mod> {
		return this.modsRepo.update(id, mod);
	}

	addVersion(version: CreationModVersion): Promise<ModVersion> {
		return this.modsRepo.addVersion(version);
	}

	updateVersion(id: string, version: ModVersion): Promise<ModVersion> {
		return this.modsRepo.updateVersion(id, version);
	}

	getAllTextures(): Promise<Record<string, ModTexture>> {
		return this.modsRepo.getAllTextures();
	}

	addTextures(textures: CreationModTexture[]): Promise<ModTexture[]> {
		return this.modsRepo.addTextures(textures);
	}

	search(params: ModSearch): Promise<Mod[]> {
		return this.modsRepo.search(params);
	}

	/**
	 * Minecraft versions at least one extracted version of a non-blacklisted mod supports, newest first
	 */
	async getPickerMinecraftVersions(): Promise<string[]> {
		const [versions, mods] = await Promise.all([this.modsRepo.getAllVersions(), this.getRaw()]);
		const minecraft = versions
			.filter((v) => v.status === "extracted" && mods[v.mod_id] && !mods[v.mod_id].blacklisted)
			.flatMap((v) => v.minecraft);
		return [...new Set(minecraft)].sort(versionSorter).reverse();
	}

	/**
	 * Mods a resource pack can be built for: every extracted version supporting the minecraft version
	 * @param pack Pack ID, used to count the textures it has contributions for
	 * @param minecraft Minecraft version
	 */
	async getPickable(pack: string, minecraft: string): Promise<PickableMod[]> {
		const [allVersions, mods, contributions] = await Promise.all([
			this.modsRepo.getAllVersions(),
			this.getRaw(),
			this.modsRepo.getPackContributions(pack),
		]);

		const byMod = new Map<string, ModVersion[]>();
		for (const v of allVersions) {
			const mod = mods[v.mod_id];
			if (v.status !== "extracted" || !v.minecraft.includes(minecraft) || !mod || mod.blacklisted)
				continue;
			byMod.set(v.mod_id, [...(byMod.get(v.mod_id) ?? []), v]);
		}

		// a texture used by many versions is only read once
		const textures = await this.modsRepo.getAllTextures();
		const textureIds = new Map<string, Set<string>>();
		for (const texture of Object.values(textures))
			for (const versionIds of Object.values(texture.paths))
				for (const versionId of versionIds) {
					if (!textureIds.has(versionId)) textureIds.set(versionId, new Set());
					textureIds.get(versionId)?.add(texture.id);
				}

		const contributed = new Set(contributions.map((c) => c.mod_texture_id));

		// textures linked to a vanilla texture use its contributions
		const vanillaIds = [
			...new Set(
				Object.values(textures)
					.map((t) => t.vanilla_id)
					.filter((id): id is number => id !== undefined),
			),
		];
		const vanillaDone = new Set<number>(
			vanillaIds.length
				? (
						await new ContributionFirestormRepository().searchByIdAndPacks(
							vanillaIds as unknown as string[],
							[pack],
						)
					).map((c) => Number(c.texture))
				: [],
		);
		const isDone = (id: string) =>
			contributed.has(id) || vanillaDone.has(textures[id]?.vanilla_id as number);

		const picks = await Promise.all(
			[...byMod.entries()].map(async ([modId, versions]): Promise<PickableMod> => {
				const sorted = versions.sort((a, b) => versionSorter(b.version, a.version));
				return {
					mod: mods[modId],
					versions: await Promise.all(
						sorted.map((version) => {
							const ids = textureIds.get(version.id) ?? new Set<string>();
							const done = [...ids].filter(isDone);
							return {
								version,
								total: ids.size,
								contributed: done.length,
								blacklisted: [...ids].filter((id) => textures[id]?.blacklisted && !isDone(id))
									.length,
							};
						}),
					),
				};
			}),
		);
		return picks.sort((a, b) => a.mod.name.localeCompare(b.mod.name));
	}

	getAllVersions(): Promise<ModVersion[]> {
		return this.modsRepo.getAllVersions();
	}

	getVersions(modId: string): Promise<ModVersion[]> {
		return this.modsRepo.getVersions(modId);
	}

	getVersionById(id: string): Promise<ModVersion> {
		return this.modsRepo.getVersionById(id);
	}

	getTextureById(id: string): Promise<ModTexture> {
		return this.modsRepo.getTextureById(id);
	}

	/**
	 * Say a mod texture is identical to a vanilla texture (or remove the link with null)
	 */
	async setTextureVanilla(id: string, vanillaId: number | null): Promise<ModTexture> {
		const texture = await this.getTextureById(id);
		if (vanillaId === null) {
			delete texture.vanilla_id;
			return this.modsRepo.updateTexture(id, texture);
		}

		// throws a 404 if the vanilla texture doesn't exist
		await new TextureService().getById(vanillaId);
		return this.modsRepo.updateTexture(id, { ...texture, vanilla_id: vanillaId });
	}

	getTexturesByVersion(versionId: string): Promise<ModTexture[]> {
		return this.modsRepo.getTexturesByVersion(versionId);
	}

	updateTextures(textures: ModTexture[]): Promise<void> {
		return this.modsRepo.updateTextures(textures);
	}

	removeTextures(ids: string[]): Promise<void> {
		return this.modsRepo.removeTextures(ids);
	}

	/**
	 * Textures of a mod version with the path they have there and their image urls
	 */
	async getVersionTextures(versionId: string): Promise<ModVersionTexture[]> {
		const version = await this.getVersionById(versionId);
		const textures = await this.getTexturesByVersion(version.id);

		// the original textures are in the default pack's repository, which can be private: they are
		// served by the API instead of linking to GitHub
		const origin = new AuthService().targetToURL("api");
		const url = (textureId: string) =>
			`${origin}/v2/mod-versions/${version.id}/textures/${textureId}/image`;

		return textures
			.flatMap((texture) =>
				Object.entries(texture.paths)
					.filter(([, ids]) => ids.includes(version.id))
					.map(([path]) => ({ jarPath: path, texture })),
			)
			.flatMap(({ jarPath, texture }) => {
				const location = parseJarPath(jarPath);
				if (!location) return [];
				return {
					...location,
					texture: {
						...texture,
						url: url(texture.id),
					},
				};
			})
			.sort((a, b) => `${a.namespace}/${a.path}`.localeCompare(`${b.namespace}/${b.path}`));
	}

	/**
	 * Image of the original texture of a mod version, read from the default pack's repository
	 */
	async getVersionTextureImage(versionId: string, textureId: string): Promise<Buffer> {
		const version = await this.getVersionById(versionId);
		const [mod, pack, texture] = await Promise.all([
			this.getById(version.mod_id),
			new PackService().getById(DEFAULT_PACK),
			this.getTextureById(textureId),
		]);

		const jarPath = Object.keys(texture.paths).find((p) => texture.paths[p].includes(version.id));
		const github = pack.github.modded;
		if (!jarPath || !github?.repo) throw new NotFoundError("Texture image not found");

		const image = await getFileContent(
			github.org,
			github.repo,
			mod.slug,
			`${version.version}/${jarPath}`,
		);
		if (!image) throw new NotFoundError("Texture image not found");
		return image;
	}

	/**
	 * IDs of the versions of a mod that use a texture
	 */
	async getTextureVersionIds(modId: string, textureId: string): Promise<string[]> {
		const texture = await this.getTextureById(textureId);
		const used = new Set(Object.values(texture.paths).flat());
		return (await this.getVersions(modId)).filter((v) => used.has(v.id)).map((v) => v.id);
	}

	/**
	 * Change what an admin can edit of a mod
	 */
	async updateMod(id: string, body: ModUpdateBody): Promise<Mod> {
		const mod = await this.getById(id);
		if (body.version_validator !== undefined) {
			try {
				new RegExp(body.version_validator);
			} catch {
				throw new BadRequestError("The version validator isn't a valid regular expression");
			}
		}
		return this.update(id, { ...mod, ...body });
	}

	async setVersionBlacklisted(id: string, { blacklisted }: BlacklistBody): Promise<ModVersion> {
		const version = await this.getVersionById(id);
		return this.updateVersion(id, { ...version, blacklisted });
	}

	async setTextureBlacklisted(id: string, { blacklisted }: BlacklistBody): Promise<ModTexture> {
		const texture = await this.getTextureById(id);
		return this.modsRepo.updateTexture(id, { ...texture, blacklisted });
	}

	/**
	 * Set the other names of a texture, trimmed and without duplicates
	 */
	async setTextureAliases(id: string, { aliases }: ModTextureAliasesBody): Promise<ModTexture> {
		const texture = await this.getTextureById(id);
		const cleaned = [...new Set(aliases.map((a) => a.trim()).filter(Boolean))];
		return this.modsRepo.updateTexture(id, { ...texture, aliases: cleaned });
	}

	/**
	 * Take versions out of the textures using them. Textures left without any version are removed
	 * with their contributions (the image blobs and the repositories are kept).
	 * @returns number of contributions removed
	 */
	async detachVersions(versionIds: string[]): Promise<number> {
		const removed = new Set(versionIds);
		const textures = Object.values(await this.getAllTextures());

		const changed: ModTexture[] = [];
		const orphans: string[] = [];
		for (const texture of textures) {
			const paths: Record<string, string[]> = {};
			for (const [path, ids] of Object.entries(texture.paths)) {
				const left = ids.filter((id) => !removed.has(id));
				if (left.length) paths[path] = left;
			}
			const unchanged =
				Object.values(paths).flat().length === Object.values(texture.paths).flat().length;
			if (unchanged) continue;
			if (Object.keys(paths).length) changed.push({ ...texture, paths });
			else orphans.push(texture.id);
		}

		const contributions = await this.modsRepo.getContributions(orphans, {});
		await this.modsRepo.removeContributions(contributions.map((c) => c.id));
		await this.modsRepo.removeTextures(orphans);
		await this.updateTextures(changed);
		return contributions.length;
	}

	/**
	 * Remove a mod with its versions. Textures used only by it are removed with their contributions.
	 */
	async removeMod(id: string): Promise<ModRemoval> {
		await this.getById(id);
		const versions = await this.getVersions(id);
		await this.assertNotInModpacks(versions);

		const contributions = await this.detachVersions(versions.map((v) => v.id));
		await this.modsRepo.removeVersions(versions.map((v) => v.id));
		await this.modsRepo.removeMod(id);
		return { versions: versions.length, contributions };
	}

	/**
	 * Remove a mod version. Textures used only by it are removed with their contributions.
	 */
	async removeVersion(id: string): Promise<ModRemoval> {
		const version = await this.getVersionById(id);
		await this.assertNotInModpacks([version]);

		const contributions = await this.detachVersions([id]);
		await this.modsRepo.removeVersions([id]);
		return { versions: 1, contributions };
	}

	private async assertNotInModpacks(versions: ModVersion[]): Promise<void> {
		const used = await new ModpacksService().getVersionsUsing(versions.map((v) => v.id));
		if (used.length)
			throw new BadRequestError(
				`Used by ${used.length} modpack version(s), remove it from them first`,
			);
	}

	/**
	 * Contributions of the textures a mod uses
	 */
	async getContributions(modId: string, params: ModContributionSearch): Promise<ModContribution[]> {
		const versions = new Set((await this.getVersions(modId)).map((v) => v.id));
		const textureIds = Object.values(await this.getAllTextures())
			.filter((t) => Object.values(t.paths).some((ids) => ids.some((id) => versions.has(id))))
			.map((t) => t.id);
		return this.modsRepo.getContributions(textureIds, params);
	}

	getContributionById(id: string): Promise<ModContribution> {
		return this.modsRepo.getContributionById(id);
	}

	/** Contributions of textures, the latest of each pack is the one to use */
	getTextureContributions(
		textureIds: string[],
		params: ModContributionSearch = {},
	): Promise<ModContribution[]> {
		return this.modsRepo.getContributions(textureIds, params);
	}

	addContributions(contributions: CreationModContribution[]): Promise<ModContribution[]> {
		return this.modsRepo.addContributions(contributions);
	}

	updateContributions(contributions: ModContribution[]): Promise<void> {
		return this.modsRepo.updateContributions(contributions);
	}

	removeContributions(ids: string[]): Promise<void> {
		return this.modsRepo.removeContributions(ids);
	}
}

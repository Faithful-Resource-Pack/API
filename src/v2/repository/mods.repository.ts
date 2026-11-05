import { SearchOption } from "firestorm-db";
import { modContributions, modTextures, modVersions, mods } from "../firestorm";
import {
	CreationMod,
	CreationModContribution,
	CreationModTexture,
	CreationModVersion,
	Mod,
	ModContribution,
	ModContributionSearch,
	ModSearch,
	ModTexture,
	ModVersion,
	ModsRepository,
} from "../interfaces";

export default class ModsFirestormRepository implements ModsRepository {
	getRaw(): Promise<Record<string, Mod>> {
		return mods.readRaw();
	}

	getById(id: string): Promise<Mod> {
		return mods.get(id);
	}

	async add(mod: CreationMod): Promise<Mod> {
		const id = await mods.add(mod as Mod);
		return { ...mod, id } as Mod;
	}

	async update(id: string, mod: Mod): Promise<Mod> {
		await mods.set(id, mod);
		return { ...mod, id };
	}

	async addVersion(version: CreationModVersion): Promise<ModVersion> {
		const id = await modVersions.add(version as ModVersion);
		return { ...version, id };
	}

	async updateVersion(id: string, version: ModVersion): Promise<ModVersion> {
		await modVersions.set(id, version);
		return { ...version, id };
	}

	getAllTextures(): Promise<Record<string, ModTexture>> {
		return modTextures.readRaw();
	}

	async addTextures(textures: CreationModTexture[]): Promise<ModTexture[]> {
		if (!textures.length) return [];
		const ids = await modTextures.addBulk(textures as ModTexture[]);
		return textures.map((t, i) => ({ ...t, id: ids[i] }));
	}

	search(params: ModSearch): Promise<Mod[]> {
		const { name, slug, blacklisted } = params;
		const options: SearchOption<Mod>[] = [];
		if (name) options.push({ field: "name", criteria: "includes", value: name, ignoreCase: true });
		if (slug) options.push({ field: "slug", criteria: "==", value: slug });
		if (blacklisted !== undefined)
			options.push({ field: "blacklisted", criteria: "==", value: blacklisted });

		// calling Object.values as a callback gets rid of type inference
		return options.length ? mods.search(options) : mods.readRaw().then((res) => Object.values(res));
	}

	getVersions(modId: string): Promise<ModVersion[]> {
		return modVersions.search([{ field: "mod_id", criteria: "==", value: modId }]);
	}

	getAllVersions(): Promise<ModVersion[]> {
		return modVersions.readRaw().then((res) => Object.values(res));
	}

	getPackContributions(pack: string): Promise<ModContribution[]> {
		return modContributions.search([{ field: "pack", criteria: "==", value: pack }]);
	}

	getVersionById(id: string): Promise<ModVersion> {
		return modVersions.get(id);
	}

	getTextureById(id: string): Promise<ModTexture> {
		return modTextures.get(id);
	}

	async updateTexture(id: string, texture: ModTexture): Promise<ModTexture> {
		await modTextures.set(id, texture);
		return { ...texture, id };
	}

	async updateTextures(textures: ModTexture[]): Promise<void> {
		if (!textures.length) return;
		await modTextures.setBulk(
			textures.map((t) => t.id),
			textures,
		);
	}

	/**
	 * Textures a mod version uses, the version ids are nested in a map so this reads the collection.
	 * Fine for admin and build jobs, cache it if it ends up on a hot path.
	 */
	async getTexturesByVersion(versionId: string): Promise<ModTexture[]> {
		const textures = Object.values(await modTextures.readRaw());
		return textures.filter((t) => Object.values(t.paths).some((ids) => ids.includes(versionId)));
	}

	async removeTextures(ids: string[]): Promise<void> {
		if (ids.length) await modTextures.removeBulk(ids);
	}

	getContributions(
		textureIds: string[],
		params: ModContributionSearch,
	): Promise<ModContribution[]> {
		if (!textureIds.length) return Promise.resolve([]);
		const { pack, texture_id } = params;
		const options: SearchOption<ModContribution>[] = [
			{ field: "mod_texture_id", criteria: "in", value: textureIds },
		];
		if (pack) options.push({ field: "pack", criteria: "==", value: pack });
		if (texture_id) options.push({ field: "mod_texture_id", criteria: "==", value: texture_id });
		return modContributions.search(options);
	}

	getContributionById(id: string): Promise<ModContribution> {
		return modContributions.get(id);
	}

	async addContributions(contributions: CreationModContribution[]): Promise<ModContribution[]> {
		if (!contributions.length) return [];
		const ids = await modContributions.addBulk(contributions as ModContribution[]);
		return contributions.map((c, i) => ({ ...c, id: ids[i] }));
	}

	async updateContributions(contributions: ModContribution[]): Promise<void> {
		if (!contributions.length) return;
		await modContributions.setBulk(
			contributions.map((c) => c.id),
			contributions,
		);
	}

	async removeMod(id: string): Promise<void> {
		await mods.remove(id);
	}

	async removeVersions(ids: string[]): Promise<void> {
		if (ids.length) await modVersions.removeBulk(ids);
	}

	async removeContributions(ids: string[]): Promise<void> {
		if (ids.length) await modContributions.removeBulk(ids);
	}
}

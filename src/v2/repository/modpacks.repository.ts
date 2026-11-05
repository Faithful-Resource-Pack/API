import { modpackVersions, modpacks } from "../firestorm";
import { Modpack, ModpackVersion, ModpacksRepository } from "../interfaces";

export default class ModpacksFirestormRepository implements ModpacksRepository {
	getRaw(): Promise<Record<string, Modpack>> {
		return modpacks.readRaw();
	}

	getById(id: string): Promise<Modpack> {
		return modpacks.get(id);
	}

	getVersions(modpackId: string): Promise<ModpackVersion[]> {
		return modpackVersions.search([{ field: "modpack_id", criteria: "==", value: modpackId }]);
	}

	getVersionById(id: string): Promise<ModpackVersion> {
		return modpackVersions.get(id);
	}

	getVersionsUsing(modVersionIds: string[]): Promise<ModpackVersion[]> {
		if (!modVersionIds.length) return Promise.resolve([]);
		return modpackVersions.search([
			{ field: "mod_versions", criteria: "array-contains-any", value: modVersionIds },
		]);
	}
}

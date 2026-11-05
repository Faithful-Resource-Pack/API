import { Modpack, ModpackVersion } from "../interfaces";
import ModpacksFirestormRepository from "../repository/modpacks.repository";

export default class ModpacksService {
	private readonly modpacksRepo = new ModpacksFirestormRepository();

	getRaw(): Promise<Record<string, Modpack>> {
		return this.modpacksRepo.getRaw();
	}

	getById(id: string): Promise<Modpack> {
		return this.modpacksRepo.getById(id);
	}

	getVersions(modpackId: string): Promise<ModpackVersion[]> {
		return this.modpacksRepo.getVersions(modpackId);
	}

	getVersionById(id: string): Promise<ModpackVersion> {
		return this.modpacksRepo.getVersionById(id);
	}

	getVersionsUsing(modVersionIds: string[]): Promise<ModpackVersion[]> {
		return this.modpacksRepo.getVersionsUsing(modVersionIds);
	}
}

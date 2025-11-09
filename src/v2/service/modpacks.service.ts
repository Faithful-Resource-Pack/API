import { Modpack } from "../interfaces";
import { modpacks } from "../firestorm";
import * as ModpacksFirestormRepository from "../repository/modpacks.repository";

export default class ModpacksService {
	private readonly modsRepo = ModpacksFirestormRepository;

	getRaw(): Promise<Record<string, Modpack>> {
		return modpacks.readRaw();
	}

	getThumbnail(id: number): Promise<string> {
		return this.modsRepo.getThumbnail(id);
	}
}

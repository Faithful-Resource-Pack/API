import { Mod } from "../interfaces";
import { mods } from "../firestorm";
import * as ModsFirestormRepository from "../repository/mods.repository";

export default class ModsService {
	private readonly modsRepo = ModsFirestormRepository;

	getRaw(): Promise<Record<string, Mod>> {
		return mods.readRaw();
	}

	getThumbnail(id: number): Promise<string> {
		return this.modsRepo.getThumbnail(id);
	}

	getCurseForgeName(id: number): Promise<string> {
		return this.modsRepo.getCurseForgeName(id);
	}

	getNameInDatabase(id: string): Promise<string> {
		return this.modsRepo.getNameInDatabase(id);
	}
}

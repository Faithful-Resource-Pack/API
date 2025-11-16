import { Mod } from "../interfaces";
import * as ModsRepo from "../repository/mods.repository";

export default class ModsService {
	getRaw(): Promise<Record<string, Mod>> {
		return ModsRepo.getRaw();
	}

	getThumbnail(id: number): Promise<string> {
		return ModsRepo.getThumbnail(id);
	}

	getCurseForgeName(id: number): Promise<string> {
		return ModsRepo.getCurseForgeName(id);
	}

	getNameInDatabase(id: string): Promise<string> {
		return ModsRepo.getNameInDatabase(id);
	}
}

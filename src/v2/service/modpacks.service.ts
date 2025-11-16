import { Modpack } from "../interfaces";
import * as ModpacksRepo from "../repository/modpacks.repository";

export default class ModpacksService {
	getRaw(): Promise<Record<string, Modpack>> {
		return ModpacksRepo.getRaw();
	}

	getThumbnail(id: number): Promise<string> {
		return ModpacksRepo.getThumbnail(id);
	}
}

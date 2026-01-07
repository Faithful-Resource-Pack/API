import { Modpack } from "../interfaces";
import ModpacksFirestormRepository from "../repository/modpacks.repository";

export default class ModpacksService {
	private readonly modsRepo = new ModpacksFirestormRepository();

	getRaw(): Promise<Record<string, Modpack>> {
		return this.modsRepo.getRaw();
	}

	getThumbnail(id: number): Promise<string> {
		return this.modsRepo.getThumbnail(id);
	}
}

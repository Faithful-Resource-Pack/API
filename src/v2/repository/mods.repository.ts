import axios from "axios";
import { NotFoundError } from "../tools/errorTypes";
import { mods } from "../firestorm";
import { Mod, ModsRepository } from "../interfaces";

export default class ModsFirestormRepository implements ModsRepository {
	public getRaw(): Promise<Record<string, Mod>> {
		return mods.readRaw();
	}

	public async getThumbnail(id: number): Promise<string> {
		const res = await axios(`https://api.curseforge.com/v1/mods/${id}`, {
			headers: { "x-api-key": process.env.CURSEFORGE_API_KEY },
		});
		const url: string = res?.data?.data?.logo?.thumbnailUrl;

		// fixes bug where no logo provided : 400 : Cannot read 'thumbnailUrl' of null
		if (url) return url;
		throw new NotFoundError("No thumbnail found for this mod");
	}

	public async getCurseForgeName(id: number): Promise<string> {
		const res = await axios(`https://api.curseforge.com/v1/mods/${id}`, {
			headers: { "x-api-key": process.env.CURSEFORGE_API_KEY },
		});
		const name: string = res?.data?.data?.name;

		// Preventive fix if there is somehow no name
		if (name) return name;
		throw new NotFoundError("No name found for this mod");
	}

	public async getNameInDatabase(id: string): Promise<string> {
		const res = await mods.get(id);
		return res.name;
	}
}

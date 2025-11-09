import axios from "axios";
import { NotFoundError } from "../tools/errorTypes";
import { mods } from "../firestorm";
import { Mod } from "../interfaces";

export function getRaw(): Promise<Record<string, Mod>> {
	return mods.readRaw();
}

export async function getThumbnail(id: number): Promise<string> {
	const res = await axios(`https://api.curseforge.com/v1/mods/${id}`, {
		headers: { "x-api-key": process.env.CURSEFORGE_API_KEY },
	});
	const url: string = res?.data?.data?.logo?.thumbnailUrl;

	// fixes bug where no logo provided : 400 : Cannot read 'thumbnailUrl' of null
	if (url) return url;
	throw new NotFoundError("No thumbnail found for this mod");
}

export async function getCurseForgeName(id: number): Promise<string> {
	const res = await axios(`https://api.curseforge.com/v1/mods/${id}`, {
		headers: { "x-api-key": process.env.CURSEFORGE_API_KEY },
	});
	const name: string = res?.data?.data?.name;

	// Preventive fix if there is somehow no name
	if (name) return name;
	throw new NotFoundError("No name found for this mod");
}

export async function getNameInDatabase(id: string): Promise<string> {
	const res = await mods.get(id);
	return res.name;
}

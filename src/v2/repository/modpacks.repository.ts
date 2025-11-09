import axios from "axios";
import { modpacks } from "../firestorm";
import { Modpack } from "../interfaces";

export function getRaw(): Promise<Record<string, Modpack>> {
	return modpacks.readRaw();
}

export async function getThumbnail(id: number): Promise<string> {
	const res = await axios(`https://api.curseforge.com/v1/mods/${id}`, {
		headers: { "x-api-key": process.env.CURSEFORGE_API_KEY },
	});
	return res.data.data.logo.thumbnailUrl;
}

import axios from "axios";
import firestorm from "firestorm-db";
import { Paths, Uses, Contributions, TextureAll, Path, Use } from "~/v2/interfaces";
import { KnownPacks, TextureMCMETA } from "~/v2/interfaces/textures";
import { TextureUse } from "~/v1/firestorm/uses";
import config from "../config";

import { uses } from "./uses";
import { contributions } from "..";
import { mapPaths, mapTexture, mapUses } from "../../tools/mapping/textures";
import { settings } from "../settings";
import { MinecraftSorter } from "../../tools/sorter";

config();

export const textures = firestorm.collection("textures", (el) => {
	el.uses = async (): Promise<Uses> =>
		uses
			.search([
				{
					field: "textureID", // todo: (DATA 2.0) to be replaced by texture
					criteria: "==",
					value: el[firestorm.ID_FIELD],
				},
			])
			.then(mapUses); // todo: (DATA 2.0) remove after database rewrite

	el.paths = async (): Promise<Paths> =>
		el
			.uses()
			.then((_uses) => Promise.all(_uses.map((_use) => uses.get(_use.id).then((u) => u.paths()))))
			.then((arr) => arr.flat())
			.then(mapPaths); // todo: (DATA 2.0) remove after database rewrite

	el.url = async (pack: KnownPacks, version: string): Promise<string> => {
		// https://raw.githubusercontent.com/Faithful-Resource-Pack/App/main/resources/transparency.png  // fallback image
		// https://raw.githubusercontent.com/Faithful-Resource-Pack/Faithful-Java-32x/Jappa-1.18.1/assets/minecraft/textures/block/acacia_door_bottom.png

		let urls: string;
		let path: Path;
		let use: Use;

		return settings
			.read_raw()
			.then((settings_file: { [key: string]: any }) => {
				urls = settings_file.repositories.raw[pack];
				return el.paths();
			})
			.then((texturePaths: Paths) => {
				// eq to [0]
				if (version === "latest") {
					[path] = texturePaths;
					[version] = path.versions.sort(MinecraftSorter).reverse();
				} else [path] = texturePaths.filter((p: Path) => p.versions.includes(version));

				return el.uses();
			})
			.then((_uses: Uses) => {
				// eq to [0]
				[use] = _uses.filter((u: Use) => u.id === path.use);
				return `${urls[use.edition]}${version}/${
					use.assets === null ? path.name : `assets/${use.assets}/${path.name}`
				}`;
			})
			.catch("https://raw.githubusercontent.com/Faithful-Resource-Pack/App/main/resources/transparency.png"); // fallback image
	};

	el.contributions = async (): Promise<Contributions> =>
		contributions
			.search([
				{
					field: "texture",
					criteria: "==",
					value: parseInt(el[firestorm.ID_FIELD], 10),
				},
			])

	el.mcmeta = async (): Promise<TextureMCMETA> => 
		el
			.paths()
			.then((ps: Paths) => ps.find((path: Path) => path.mcmeta) || null)
			.then((p: Path | null) => Promise.all([el.uses(), p]))
			.then(([us, p]: [Uses, Path | null]) => { 
				if (p === null) return [null, null]
				return [us.find((use: Use) => use.id === p.use), p]
			})
			.then(([u, p]: [Use, Path | null]) => {
				if (u === null || p === null) return null;
				return axios.get(`https://raw.githubusercontent.com/CompliBot/Default-Java/${p.versions.sort(MinecraftSorter).reverse()[0]}/${u.assets === null ? p.name : `assets/${u.assets}/${p.name}`}.mcmeta`);
			})
			.then((res: any | null) => res ? res.data : {})
			.catch({});


	el.all = async (): Promise<TextureAll> => {
		const output = mapTexture(el) as any;
		return el
			.uses()
			.then((tUses: TextureUse[]) => {
				output.uses = tUses;
				return el.paths();
			})
			.then((tPaths: Path[]) => {
				output.paths = tPaths;
				return el.mcmeta();
			})
			.then((mcmeta: TextureMCMETA) => {
				output.mcmeta = mcmeta;
				return el.contributions();
			})
			.then((tContribs: Contributions) => {
				output.contributions = tContribs;
				return output;
			});
	};

	return el;
});

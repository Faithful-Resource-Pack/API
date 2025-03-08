import axios from "axios";
import firestorm from "firestorm-db";
import {
	Paths,
	Contributions,
	TextureAll,
	Path,
	Uses,
	PackID,
	FirestormTexture,
	MCMETA,
} from "../../interfaces";
import "../config";

import { uses } from "./uses";
import { contributions, packs } from "..";
import { MinecraftSorter } from "../../tools/sorter";
import { NotFoundError } from "../../tools/errors";

export const textures = firestorm.collection<FirestormTexture>("textures", (el) => {
	el.uses = (): Promise<Uses> =>
		uses.search([
			{
				field: "texture",
				criteria: "==",
				value: el[firestorm.ID_FIELD],
			},
		]);

	el.paths = async (): Promise<Paths> => {
		const textureUses = await el.uses();
		const proms = await Promise.all(
			textureUses.map((_use) => uses.get(_use.id).then((u) => u.getPaths())),
		);
		return proms.flat();
	};

	el.url = async (pack: PackID, version: string): Promise<string> => {
		const baseURL = "https://raw.githubusercontent.com";

		const { github } = await packs.get(pack);
		const availableEditions = Object.keys(github);

		// get use for edition that exists
		const textureUses = await el.uses();
		const foundUse = textureUses.find((u) => availableEditions.includes(u.edition));
		if (!foundUse) throw new NotFoundError(`Pack ${pack} doesn't support this edition yet!`);

		const texturePaths = await el.paths();

		const candidatePaths = texturePaths.filter((p) => p.use === foundUse.id);

		let path: Path;
		if (version === "latest") {
			path = candidatePaths[0];
			version = path.versions.sort(MinecraftSorter).at(-1);
		} else path = candidatePaths.find((p) => p.versions.includes(version));

		if (!path) throw new NotFoundError(`No path found for version ${version}`);

		// confirmed that edition exists already so we can safely destructure
		const { org, repo } = github[foundUse.edition];
		return `${baseURL}/${org}/${repo}/${version}/${path.name}`;
	};

	el.contributions = (): Promise<Contributions> =>
		contributions.search([
			{
				field: "texture",
				criteria: "==",
				value: Number(el[firestorm.ID_FIELD]),
			},
		]);

	el.mcmeta = async (): Promise<MCMETA> => {
		const texturePaths = await el.paths();
		const foundPath = texturePaths.find((path) => path.mcmeta === true);
		if (!foundPath) return {};
		return axios
			.get(
				// mcmetas only exist on java edition
				`https://raw.githubusercontent.com/Faithful-Pack/Default-Java/${foundPath.versions
					.sort(MinecraftSorter)
					.at(-1)}/${foundPath.name}.mcmeta`,
			)
			.then((res) => (res ? res.data : {}))
			.catch(() => ({})); // avoid crash if mcmeta file cannot be found
	};

	el.all = async (): Promise<TextureAll> => ({
		id: el.id,
		name: el.name,
		tags: el.tags,
		uses: await el.uses(),
		paths: await el.paths(),
		mcmeta: await el.mcmeta(),
		contributions: await el.contributions(),
	});

	return el;
});

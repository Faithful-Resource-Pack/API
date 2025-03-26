import axios from "axios";
import firestorm from "firestorm-db";
import {
	TextureAll,
	Path,
	PackID,
	FirestormTexture,
	MCMETA,
	FirestormUse,
	FirestormPath,
	FirestormContribution,
	Pack,
	Uses,
	Paths,
} from "../../interfaces";
import "../config";

import { uses } from "./uses";
import { paths } from "./paths";
import { contributions, packs } from "..";
import { MinecraftSorter } from "../../tools/sorter";
import { NotFoundError } from "../../tools/errors";

/**
 * Request-less version of texture.url() for bulk usage
 * there's probably a better place to put this but oh well
 */
export function urlFromTextureData(
	pack: Pack,
	version: string,
	textureUses: Uses,
	texturePaths: Paths,
): string {
	const baseURL = "https://raw.githubusercontent.com";
	const availableEditions = Object.keys(pack.github);

	// get use for edition that exists
	const foundUse = textureUses.find((u) => availableEditions.includes(u.edition));
	if (!foundUse) throw new NotFoundError(`Pack ${pack.name} doesn't support this edition yet!`);

	const candidatePaths = texturePaths.filter((p) => p.use === foundUse.id);

	let path: Path;

	if (version === "latest" || candidatePaths.length === 1) {
		path = candidatePaths[0];
		version = path.versions.sort(MinecraftSorter).at(-1);
	} else path = candidatePaths.find((p) => p.versions.includes(version));

	if (!path) throw new NotFoundError(`No path found for version ${version}`);

	// confirmed that edition exists already so we can safely destructure
	const { org, repo } = pack.github[foundUse.edition];
	return `${baseURL}/${org}/${repo}/${version}/${path.name}`;
}

export const textures = firestorm.collection<FirestormTexture>("textures", (el) => {
	el.uses = (): Promise<FirestormUse[]> =>
		uses.search([
			{
				field: "texture",
				criteria: "==",
				value: el[firestorm.ID_FIELD],
			},
		]);

	el.paths = async (textureUses?: FirestormUse[]): Promise<FirestormPath[]> => {
		// if uses are used somewhere else we can save a request by passing it in here
		// (these methods are called a lot with the gallery/bot so it's worth the effort)
		textureUses ??= await el.uses();
		return paths.search([
			{
				field: "use",
				criteria: "in",
				value: textureUses.map((u) => u[firestorm.ID_FIELD]),
			},
		]);
	};

	el.url = async (pack: PackID, version: string): Promise<string> => {
		const packObj = await packs.get(pack);
		const textureUses = await el.uses();
		// use already-found uses to save redundant request
		const texturePaths = await el.paths(textureUses);

		return urlFromTextureData(packObj, version, textureUses, texturePaths);
	};

	el.contributions = (): Promise<FirestormContribution[]> =>
		contributions.search([
			{
				field: "texture",
				criteria: "==",
				value: Number(el[firestorm.ID_FIELD]),
			},
		]);

	el.mcmeta = async (): Promise<MCMETA> => {
		// mcmetas only exist on java edition
		const baseURL = "https://raw.githubusercontent.com/Faithful-Pack/Default-Java";

		const texturePaths = await el.paths();
		const foundPath = texturePaths.find((path) => path.mcmeta);
		if (!foundPath) return {};
		const version = foundPath.versions.sort(MinecraftSorter).at(-1);
		return axios
			.get(`${baseURL}/${version}/${foundPath.name}.mcmeta`)
			.then((res) => (res ? res.data : {}))
			.catch(() => ({})); // avoid crash if mcmeta file cannot be found
	};

	el.all = async (): Promise<TextureAll> => {
		const textureUses = await el.uses();
		return {
			id: el.id,
			name: el.name,
			tags: el.tags,
			uses: textureUses,
			paths: await el.paths(textureUses),
			mcmeta: await el.mcmeta(),
			contributions: await el.contributions(),
		};
	};

	return el;
});

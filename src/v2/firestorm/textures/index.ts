import axios from "axios";
import firestorm from "firestorm-db";
import {
	FirestormContribution,
	FirestormPath,
	FirestormTexture,
	FirestormUse,
	MCMETA,
	Pack,
	PackID,
	Path,
	TextureAll,
	Use,
} from "../../interfaces";
import "../config";
import * as cache from "../../tools/cache";

import { uses } from "./uses";
import { paths } from "./paths";
import { contributions, packs } from "..";
import versionSorter from "../../tools/versionSorter";
import { NotFoundError } from "../../tools/errorTypes";

/**
 * Request-less version of texture.url() for bulk usage
 * there's probably a better place to put this but oh well
 */
export function urlFromTextureData(
	pack: Pack,
	version: string,
	textureUses: Use[],
	texturePaths: Path[],
): string {
	const baseURL = "https://raw.githubusercontent.com";
	const availableEditions = Object.keys(pack.github);

	// get use for edition that exists
	const foundUse = textureUses.find((u) => availableEditions.includes(u.edition));
	if (!foundUse) throw new NotFoundError(`Pack ${pack.name} doesn't support this edition yet!`);

	const candidatePaths = texturePaths.filter((p) => p.use === foundUse.id);

	let path: Path | undefined;

	if (version === "latest" || candidatePaths.length === 1) {
		path = candidatePaths[0];
		// if there's one path try to get the right version, otherwise take the first one
		if (!path.versions.includes(version))
			version = path.versions.sort(versionSorter).at(-1) || "unknown";
	} else path = candidatePaths.find((p) => p.versions.includes(version));

	if (!path) throw new NotFoundError(`No path found for version ${version}`);

	// confirmed that edition exists already so we can safely destructure
	const { org, repo } = pack.github[foundUse.edition] || {};
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

	el.mcmeta = (texturePaths?: FirestormPath[]): Promise<MCMETA> =>
		// mcmetas practically never change and are very expensive to run so cache them weekly
		cache.handle(
			`mcmeta-${el.id}`,
			async () => {
				// mcmetas only exist on java edition
				const baseURL = "https://raw.githubusercontent.com/Faithful-Pack/Default-Java";

				texturePaths ??= await el.paths();
				const foundPath = texturePaths.find((path) => path.mcmeta);
				if (!foundPath) return {};
				const version = foundPath.versions.sort(versionSorter).at(-1);
				return axios
					.get<MCMETA>(`${baseURL}/${version}/${foundPath.name}.mcmeta`)
					.then((res) => (res ? res.data : {}))
					.catch(() => ({})); // avoid crash if mcmeta file cannot be found
			},
			604800000,
		);

	el.all = async (): Promise<TextureAll> => {
		const textureUses = await el.uses();
		const texturePaths = await el.paths(textureUses);
		return {
			id: el.id,
			name: el.name,
			tags: el.tags,
			uses: textureUses,
			paths: texturePaths,
			mcmeta: await el.mcmeta(texturePaths),
			contributions: await el.contributions(),
		};
	};

	return el;
});

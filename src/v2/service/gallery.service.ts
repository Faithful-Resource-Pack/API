import { settings, textures, urlFromTextureData } from "../firestorm";
import {
	Edition,
	GalleryModalResult,
	GalleryResult,
	MCMETA,
	PackID,
	Path,
	Texture,
	Use,
} from "../interfaces";
import { NotFoundError } from "../tools/errorTypes";
import PackService from "./pack.service";
import PathService from "./path.service";
import TextureService from "./texture.service";
import UseService from "./use.service";

export default class GalleryService {
	private readonly pathService = new PathService();

	private readonly useService = new UseService();

	private readonly textureService = new TextureService();

	private readonly packService = new PackService();

	async urlsFromTextures(
		pack: PackID,
		version: string,
		textureIDs: number[],
		textureToUse: Record<string, Use>,
		useToPath: Record<string, Path>,
	): Promise<string[]> {
		const baseURL = "https://raw.githubusercontent.com";
		const { github } = await this.packService.getById(pack);
		const { versions } = (await settings.readRaw()) as { versions: Record<Edition, string[]> };

		return (
			textureIDs
				.map((textureID) => textureToUse[textureID])
				// saves an object lookup to filter after map
				.filter((use) => use)
				.map((use) => {
					const path = useToPath[use.id].name;
					const packGithub = github[use.edition];
					// invalid urls get handled by the gallery itself
					if (!packGithub) return "";

					// convert "latest" to actual latest version
					const githubVersion = version === "latest" ? versions[use.edition][0] : version;
					return `${baseURL}/${packGithub.org}/${packGithub.repo}/${githubVersion}/${path}`;
				})
		);
	}

	public async search(
		pack: PackID,
		version: string,
		tag?: string,
		search?: string,
	): Promise<GalleryResult[]> {
		/**
		 * it is more optimized to go down when searching because we have fewer textures than paths
		 * texture -> texture found => uses -> uses found => paths -> paths found
		 */

		const texturesFound = await this.textureService.search(search, tag, true);

		if (texturesFound.length === 0) return [];
		const ids = texturesFound.map((t) => Number(t.id));

		const usesFound = await this.useService.getUsesByIds(ids);
		if (usesFound.length === 0) return [];
		const useIDs = usesFound.map((u) => u.id);

		const pathsFound = await this.pathService.getPathsByUseIdsAndVersion(useIDs, version);
		if (Object.keys(pathsFound).length === 0) return [];

		/**
		 * From this we can go up, to filter with the found results
		 * because a texture may not have a matching use or a use a matching path
		 * paths found -> uses filtered -> textures filtered
		 * no need to filter paths because they are totally matching the result (descending)
		 */

		// make two in one with reduce
		// first filter with matching uses
		const { useToPath, useObj } = usesFound.reduce(
			(acc, u) => {
				// use first matching path (urls only need one)
				const path = pathsFound[u.id];

				if (path) {
					acc.useToPath[u.id] = path;
					acc.useObj[u.texture] = u;
				}

				return acc;
			},
			{
				useToPath: {} as Record<string, Path>,
				useObj: {} as Record<string, Use>,
			},
		);

		// then filter matching textures
		const { textureToUse, texturesFiltered } = texturesFound.reduce(
			(acc, t) => {
				const use = useObj[t.id];

				if (use && useToPath[use.id]) {
					acc.textureToUse[String(t.id)] = use;
					acc.texturesFiltered.push(t);
				}

				return acc;
			},
			{
				textureToUse: {} as Record<string, Use>,
				texturesFiltered: [] as Texture[],
			},
		);

		const animations: Record<string, MCMETA> = {};

		// mcmetas are all loaded after the Promise.all finishes (faster than loop)
		await Promise.all(
			Object.keys(useToPath)
				.filter((useId) => useToPath[useId]?.mcmeta)
				.map(async (useId) => {
					// use parseInt to strip the last character
					const tex = await textures.get(Number.parseInt(useId, 10));
					const mcmeta = await tex.mcmeta();
					animations[Number.parseInt(useId, 10)] = mcmeta;
				}),
		);

		const urls = await this.urlsFromTextures(pack, version, ids, textureToUse, useToPath);

		return texturesFiltered.map((t, i) => {
			const useID = textureToUse[t.id].id;
			const pathID = useToPath[useID].id;
			return {
				textureID: t.id,
				useID,
				pathID,
				name: String(t.name),
				tags: t.tags,
				mcmeta: animations[t.id] ?? null, // unused currently
				url: urls[i],
			};
		});
	}

	public async searchModal(id: number, version: string): Promise<GalleryModalResult> {
		const packs = await this.packService.getRaw();

		const all = await this.textureService.searchProperty(id, "all");

		// if the id doesn't exist it returns an empty array
		// todo: improve id support for texture searching for cases like this
		if (Array.isArray(all)) throw new NotFoundError(`Texture ${id} not found`);

		const urls = Object.values(packs).reduce<Record<PackID, string>>((acc, pack) => {
			try {
				const url = urlFromTextureData(pack, version, all.uses, all.paths);
				acc[pack.id] = url;
			} catch {
				acc[pack.id] = "";
			}
			return acc;
		}, {});

		return {
			texture: {
				id: all.id,
				name: all.name,
				tags: all.tags,
			},
			urls,
			contributions: all.contributions,
			uses: all.uses,
			paths: all.paths,
			mcmeta: all.mcmeta,
		};
	}
}

import { settings, textures } from "../firestorm";
import {
	GalleryResult,
	PackID,
	Path,
	MCMETA,
	Textures,
	Use,
	GalleryEdition,
	Edition,
	GalleryModalResult,
	Texture,
} from "../interfaces";
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
					// invalid urls get handled by the gallery itself
					if (!github[use.edition]) return "";
					const { org, repo } = github[use.edition];

					// convert "latest" to actual latest version
					const githubVersion = version === "latest" ? versions[use.edition][0] : version;
					return `${baseURL}/${org}/${repo}/${githubVersion}/${path}`;
				})
		);
	}

	public async search(
		pack: PackID,
		edition: GalleryEdition,
		version: string,
		tag?: string,
		search?: string,
	): Promise<GalleryResult[]> {
		/**
		 * it is more optimized to go down when searching because we have fewer textures than paths
		 * texture -> texture found => uses -> uses found => paths -> paths found
		 */

		const texturesFound = await this.textureService.getByNameIdAndTag(tag, search);

		if (texturesFound.length === 0) return [];
		const ids = texturesFound.map((t) => Number(t.id));

		const usesFound = await this.useService.getUsesByIdsAndEdition(ids, edition);
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
				texturesFiltered: [] as Textures,
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

		return texturesFiltered
			.map((t, i) => {
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
			})
			.sort((a, b) => {
				if (a.name < b.name) return -1;
				if (a.name > b.name) return 1;
				return 0;
			});
	}

	public async searchModal(id: number, version: string): Promise<GalleryModalResult> {
		const packs = await this.packService.getRaw();

		const groupedUrls = await Promise.all(
			Object.keys(packs).map((pack) =>
				this.textureService
					.getURLById(id, pack, version)
					.then((url) => ({ pack, url }))
					// invalid urls get handled by the gallery itself
					.catch(() => ({ pack, url: "" })),
			),
		);

		const urls = groupedUrls.reduce<Record<PackID, string>>((acc, cur) => {
			acc[cur.pack] = cur.url;
			return acc;
		}, {});

		const texture = (await this.textureService.getById(id, null)) as Texture;

		const all = await this.textureService.getPropertyByNameOrId(id, "all");

		return {
			texture,
			urls,
			contributions: all.contributions,
			uses: all.uses,
			paths: all.paths,
			mcmeta: all.mcmeta,
		};
	}
}

import { Controller, Get, Path, Query, Route, Security, Tags } from "tsoa";
import {
	AcceptedRes,
	GalleryModalResult,
	GalleryResult,
	PackID,
	GalleryEdition,
} from "../interfaces";
import GalleryService from "../service/gallery.service";
import TextureService from "../service/texture.service";
import * as cache from "../tools/cache";
import PackService from "../service/pack.service";

@Route("gallery")
@Tags("Gallery")
export class GalleryController extends Controller {
	private readonly textureService = new TextureService();

	private readonly packService = new PackService();

	private readonly service = new GalleryService();

	/**
	 * Get gallery data with provided information
	 * @param pack Pack being searched
	 * @param edition Edition to search
	 * @param version Version to search
	 * @param tag Tag to search
	 * @param search Gallery search
	 */
	@Get("{pack}/{edition}/{version}/{tag}/")
	public search(
		@Path() pack: AcceptedRes | PackID,
		@Path() edition: GalleryEdition,
		@Path() version: string,
		@Path() tag: string,
		@Query() search?: string,
	): Promise<GalleryResult[]> {
		const RES_TO_PACKS: Record<AcceptedRes, string> = {
			"16x": "default",
			"32x": "faithful_32x",
			"64x": "faithful_64x",
		};

		// legacy translation layer
		const packID: PackID = Object.keys(RES_TO_PACKS).includes(pack) ? RES_TO_PACKS[pack] : pack;

		return cache.handle(`gallery-${packID}-${edition}-${version}-${tag}-${search ?? ""}`, () =>
			this.service.search(
				packID,
				edition,
				version,
				tag.toLowerCase() !== "all" ? tag : undefined,
				search !== undefined && search.trim() !== "" ? search.trim() : undefined,
			),
		);
	}

	/**
	 * Get gallery modal data with urls, mcmeta, texture, uses and paths
	 * @param id Searched texture name
	 * @param version Minecraft version for the images
	 */
	@Get("modal/{id}/{version}")
	public async modal(@Path() id: number, @Path() version: string): Promise<GalleryModalResult> {
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

		const texture = await this.textureService.getByNameOrId<true>(id);
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

	/**
	 * Purge gallery cache
	 */
	@Get("cache/purge")
	@Security("bot")
	@Security("discord", ["administrator"])
	public purgeCache(): Promise<void[]> {
		return cache.purge(/gallery-.+/);
	}
}

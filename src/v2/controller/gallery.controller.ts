import { Controller, Get, Path, Query, Route, Security, Tags } from "tsoa";
import { GalleryEdition, GalleryModalResult, GalleryResult, PackID } from "../interfaces";
import GalleryService from "../service/gallery.service";
import * as cache from "../tools/cache";

@Route("gallery")
@Tags("Gallery")
export class GalleryController extends Controller {
	private readonly service = new GalleryService();

	/**
	 * Get gallery data with provided information
	 * @param pack Pack being searched
	 * @param version Version to search
	 * @param tag Tag to search
	 * @param search Gallery search
	 */
	@Get("{pack}/{version}/{tag}/")
	public search(
		@Path() pack: PackID,
		@Path() version: string,
		@Path() tag: string,
		@Query() search?: string,
	): Promise<GalleryResult[]> {
		const trimmedSearch = search ? search.trim() : undefined;

		// to remove the trailing -
		const cacheSlug = trimmedSearch ? `-${trimmedSearch}` : "";

		return cache.handle(`gallery-${pack}-${version}-${tag}${cacheSlug}`, () =>
			this.service.search(
				pack,
				version,
				// "all" tag is treated as no tag
				tag.toLowerCase() === "all" ? undefined : tag,
				// also casts empty strings
				trimmedSearch || undefined,
			),
		);
	}

	/**
	 * Get gallery modal data with urls, mcmeta, texture, uses and paths
	 * @param id Searched texture ID
	 * @param version Minecraft version for the images
	 */
	@Get("modal/{id}/{version}")
	public async modal(@Path() id: number, @Path() version: string): Promise<GalleryModalResult> {
		return this.service.searchModal(id, version);
	}

	/**
	 * Purge gallery cache
	 */
	@Get("cache/purge")
	@Security("bot")
	@Security("discord", ["Administrator"])
	public purgeCache(): Promise<void[]> {
		return cache.purge(/gallery-.+/);
	}
}

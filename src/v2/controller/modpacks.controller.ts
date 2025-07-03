import { Controller, Get, Path, Request, Route, SuccessResponse, Tags } from "tsoa";
import { Request as ExRequest } from "express";
import { Modpack } from "../interfaces";
import ModpacksService from "../service/modpacks.service";
import * as cache from "../tools/cache";

@Route("modpacks")
@Tags("Modpacks")
export class ModpacksController extends Controller {
	private readonly service = new ModpacksService();

	/**
	 * Get all mods in the collection
	 */
	@Get("raw")
	public getRaw(): Promise<Record<string, Modpack>> {
		return this.service.getRaw();
	}

	/**
	 * Get a modpack thumbnail by ID
	 * @param id Mod ID
	 */
	@Get("{id}/thumbnail")
	@SuccessResponse(302, "Redirect")
	public async getThumbnail(@Path() id: string, @Request() request: ExRequest): Promise<void> {
		const url = await cache.handle(`modpacks-thumbnail-${id}`, () =>
			this.service.getThumbnail(parseInt(id, 10)),
		);

		request.res.redirect(url);
	}
}

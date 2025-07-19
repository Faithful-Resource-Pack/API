import { Controller, Get, Path, Request, Route, SuccessResponse, Tags, Response } from "tsoa";
import { Request as ExRequest } from "express";
import { Mod } from "../interfaces";
import { NotFoundError } from "../tools/errorTypes";
import ModsService from "../service/mods.service";
import * as cache from "../tools/cache";

@Route("mods")
@Tags("Mods")
export class ModsController extends Controller {
	private readonly service = new ModsService();

	/**
	 * Get all mods in the collection
	 */
	@Get("raw")
	public getRaw(): Promise<Record<string, Mod>> {
		return this.service.getRaw();
	}

	/**
	 * Get a mod thumbnail by ID
	 * @param id Mod ID
	 */
	@Get("{id}/thumbnail")
	@Response<NotFoundError>(404)
	@SuccessResponse(302, "Redirect")
	public async getThumbnail(@Path() id: string, @Request() request: ExRequest): Promise<void> {
		// if id is a number, it's a CurseForge ID
		if (Number.isNaN(parseInt(id, 10))) {
			request.res?.sendStatus(404);
			return;
		}

		const url = await cache.handle(`mods-thumbnail-${id}`, () =>
			this.service.getThumbnail(parseInt(id, 10)),
		);
		request.res?.redirect(url);
	}

	/**
	 * Get the name of the mod
	 * @param id Mod ID to get name of
	 */
	@Get("{id}/curseforge/name")
	public getCurseForgeInfo(@Path() id: string): Promise<string> {
		// if id is a number, it's a CurseForge ID
		if (Number.isNaN(parseInt(id, 10)))
			return cache.handle(`mods-curseforge-name-${id}`, () => this.service.getNameInDatabase(id));

		return cache.handle(`mods-curseforge-name-${id}`, () =>
			this.service.getCurseForgeName(parseInt(id, 10)),
		);
	}
}

import { Request as ExRequest } from "express";
import { Body, Controller, Post, Request, Route, SuccessResponse, Tags } from "tsoa";
import { ModBuildBody } from "../interfaces";
import ModBuildService from "../service/modBuild.service";

@Route("builds")
@Tags("Builds")
export class BuildsController extends Controller {
	private readonly service = new ModBuildService();

	/**
	 * Build a resource pack (zip) with a pack's textures for the selected mod versions
	 * @param body Pack, Minecraft version and mod versions to include
	 */
	@Post("mods")
	@SuccessResponse(200, "Zip archive")
	public async buildMods(@Body() body: ModBuildBody, @Request() request: ExRequest): Promise<void> {
		const zip = await this.service.buildMods(body);
		request.res
			?.type("application/zip")
			.set("Content-Disposition", `attachment; filename="${body.pack}-mods-${body.minecraft}.zip"`)
			.send(Buffer.from(zip));
	}
}

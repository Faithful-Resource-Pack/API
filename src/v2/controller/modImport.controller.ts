import { Body, Controller, Get, Path, Post, Query, Route, Security, Tags } from "tsoa";
import { ImportModBody, ImportModResult, ModPlatform } from "../interfaces";
import { PlatformFile, PlatformSearchResult } from "../tools/platforms";
import ModImportService from "../service/modImport.service";

@Route("mod-import")
@Tags("Mods")
@Security("bot")
@Security("discord", ["Administrator"])
export class ModImportController extends Controller {
	private readonly service = new ModImportService();

	/**
	 * Search CurseForge and Modrinth for mods, by name, id, slug or project url
	 * @param q Search query
	 */
	@Get("search")
	public search(@Query() q: string): Promise<PlatformSearchResult> {
		return this.service.search(q);
	}

	/**
	 * List the files of a platform project, to pick which ones to import
	 * @param platform Platform the project is hosted on
	 * @param project_id Platform project ID
	 */
	@Get("{platform}/{project_id}/files")
	public getFiles(
		@Path() platform: ModPlatform,
		@Path() project_id: string,
	): Promise<PlatformFile[]> {
		return this.service.getPlatformFiles(platform, project_id);
	}

	/**
	 * Import a mod and the given versions, textures are extracted in the background
	 * @param body Project, files to import, and optional manual versions
	 */
	@Post("")
	public importMod(@Body() body: ImportModBody): Promise<ImportModResult> {
		return this.service.importMod(body);
	}
}

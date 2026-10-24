import { Controller, Get, Path, Route, Tags } from "tsoa";
import { Modpack, ModpackVersion } from "../interfaces";
import ModpacksService from "../service/modpacks.service";

@Route("modpacks")
@Tags("Modpacks")
export class ModpacksController extends Controller {
	private readonly service = new ModpacksService();

	/**
	 * Get all modpacks in the collection
	 */
	@Get("raw")
	public getRaw(): Promise<Record<string, Modpack>> {
		return this.service.getRaw();
	}

	/**
	 * Get a modpack by ID
	 * @param id Modpack ID
	 */
	@Get("{id}")
	public getById(@Path() id: string): Promise<Modpack> {
		return this.service.getById(id);
	}

	/**
	 * Get all the versions of a modpack
	 * @param id Modpack ID
	 */
	@Get("{id}/versions")
	public getVersions(@Path() id: string): Promise<ModpackVersion[]> {
		return this.service.getVersions(id);
	}
}

@Route("modpack-versions")
@Tags("Modpacks")
export class ModpackVersionsController extends Controller {
	private readonly service = new ModpacksService();

	/**
	 * Get a modpack version by ID
	 * @param id Modpack version ID
	 */
	@Get("{id}")
	public getById(@Path() id: string): Promise<ModpackVersion> {
		return this.service.getVersionById(id);
	}
}

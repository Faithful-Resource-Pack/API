import { Body, Controller, Delete, Get, Path, Post, Put, Route, Security, Tags } from "tsoa";
import VersionService from "../service/version.service";
import { Edition, NewVersionParam } from "../interfaces";
import { WriteConfirmation } from "firestorm-db";
import * as cache from "../tools/cache";

@Route("versions")
@Tags("Versions")
export class VersionsController extends Controller {
	private readonly service = new VersionService();

	/**
	 * Get a record of editions and their respective versions
	 */
	@Get("raw")
	public getRaw(): Promise<Record<Edition, string[]>> {
		return this.service.getRaw();
	}

	/**
	 * Get a sorted list of all valid versions across editions
	 */
	@Get("list")
	public getList(): Promise<string[]> {
		return this.service.getList();
	}

	/**
	 * Get a record of editions and their latest version
	 */
	@Get("latest")
	public getLatest(): Promise<Record<Edition, string>> {
		return this.service.getLatest();
	}

	/**
	 * Get all existing Minecraft versions for a given edition
	 * @param edition Existing edition inside the settings collection
	 */
	@Get("edition/{edition}")
	public getVersionByEdition(@Path() edition: Edition): Promise<string[]> {
		return this.service.getVersionByEdition(edition);
	}

	/**
	 * Add a version to existing paths
	 * @param body Version name, edition it belongs to, and reference version if needed
	 */
	@Post("")
	@Security("bot")
	@Security("discord", ["Administrator"])
	public async addVersion(@Body() body: NewVersionParam): Promise<WriteConfirmation[]> {
		// tsoa doesn't support tuples so we retype it as array (doesn't really matter)
		const res = await this.service.add(body);
		await cache.purge("settings-raw");
		return res;
	}

	/**
	 * Rename a version (e.g. 1.17 -> 1.17.1)
	 * @param old_version Version to replace
	 * @param new_version Version to replace with
	 */
	@Put("rename/{old_version}/{new_version}")
	@Security("bot")
	@Security("discord", ["Administrator"])
	public async renameVersion(
		@Path() old_version: string,
		@Path() new_version: string,
	): Promise<WriteConfirmation[]> {
		const res = await this.service.rename(old_version, new_version);
		await cache.purge("settings-raw");
		return res;
	}

	/**
	 * Remove a version from existing paths
	 * @param body Version name to remove
	 */
	@Delete("{version}")
	@Security("bot")
	@Security("discord", ["Administrator"])
	public async deleteVersion(@Path() version: string): Promise<WriteConfirmation[]> {
		const res = await this.service.remove(version);
		await cache.purge("settings-raw");
		return res;
	}
}

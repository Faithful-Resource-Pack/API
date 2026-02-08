import { Body, Controller, Delete, Get, Path, Post, Put, Route, Security, Tags } from "tsoa";
import VersionService from "../service/version.service";
import { Edition, NewVersionParam } from "../interfaces";
import { WriteConfirmation } from "firestorm-db";

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
	@Get("flat")
	public getVersions(): Promise<string[]> {
		return this.service.getFlat();
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
	public addVersion(@Body() body: NewVersionParam): Promise<WriteConfirmation[]> {
		// tsoa doesn't support tuples so we retype it as array (doesn't really matter)
		return this.service.add(body);
	}

	/**
	 * Rename a version (e.g. 1.17 -> 1.17.1)
	 * @param old_version Version to replace
	 * @param new_version Version to replace with
	 */
	@Put("rename/{old_version}/{new_version}")
	@Security("bot")
	@Security("discord", ["Administrator"])
	public renameVersion(
		@Path() old_version: string,
		@Path() new_version: string,
	): Promise<WriteConfirmation[]> {
		return this.service.rename(old_version, new_version);
	}

	/**
	 * Remove a version from existing paths
	 * @param body Version name to remove
	 */
	@Delete("{version}")
	@Security("bot")
	@Security("discord", ["Administrator"])
	public deleteVersion(@Path() version: string): Promise<WriteConfirmation[]> {
		return this.service.remove(version);
	}
}

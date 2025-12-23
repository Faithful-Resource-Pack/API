import {
	Controller,
	Delete,
	Get,
	Path as URLPath,
	Post,
	Route,
	Security,
	Tags,
	Body,
	Put,
} from "tsoa";
import { WriteConfirmation } from "firestorm-db";
import { Path, InputPath, PathNewVersionParam, PathRemoveVersionParam } from "../interfaces";
import PathService from "../service/path.service";

@Route("paths")
@Tags("Paths")
export class PathsController extends Controller {
	private readonly service = new PathService();

	/**
	 * Get all paths in the collection
	 */
	@Get("raw")
	public getRaw(): Promise<Record<string, Path>> {
		return this.service.getRaw();
	}

	/**
	 * Creates new path
	 * @param body Input creation data
	 */
	@Post("")
	@Security("bot")
	@Security("discord", ["Administrator"])
	public createPath(@Body() body: InputPath): Promise<Path> {
		return this.service.createPath(body);
	}

	/**
	 * Add a version to existing paths
	 * @param body Version name, edition it belongs to, and reference version if needed
	 */
	@Post("versions/add")
	@Security("bot")
	@Security("discord", ["Administrator"])
	public addVersion(@Body() body: PathNewVersionParam): Promise<WriteConfirmation[]> {
		// tsoa doesn't support tuples so we retype it as array (doesn't really matter)
		return this.service.addVersion(body);
	}

	/**
	 * Remove a version from existing paths
	 * @param body Version name to remove
	 */
	@Post("versions/remove")
	@Security("bot")
	@Security("discord", ["Administrator"])
	public removeVersion(@Body() body: PathRemoveVersionParam): Promise<WriteConfirmation[]> {
		return this.service.removeVersion(body.version);
	}

	/**
	 * Rename a version (e.g. 1.17 -> 1.17.1)
	 * @param old_version Version to replace
	 * @param new_version Version to replace with
	 */
	@Put("versions/rename/{old_version}/{new_version}")
	@Security("bot")
	@Security("discord", ["Administrator"])
	public renameVersion(
		@URLPath() old_version: string,
		@URLPath() new_version: string,
	): Promise<WriteConfirmation[]> {
		return this.service.renameVersion(old_version, new_version);
	}

	/**
	 * Get path by its ID (e.g. 6096bcd96fb8b)
	 * @param id Path ID
	 */
	@Get("{id}")
	public getPathById(id: string): Promise<Path> {
		return this.service.getPathById(id);
	}

	/**
	 * Update current path
	 * @param body Input data
	 */
	@Put("{id}")
	@Security("bot")
	@Security("discord", ["Administrator"])
	public updatePath(@URLPath() id: string, @Body() body: InputPath | Path): Promise<Path> {
		return this.service.updatePathById(id, {
			...body,
			id,
		});
	}

	/**
	 * Delete path by its id (e.g. 6096bcd96fb8b)
	 * @param id Path ID
	 */
	@Delete("{id}")
	@Security("bot")
	@Security("discord", ["Administrator"])
	public deletePath(@URLPath() id: string): Promise<WriteConfirmation> {
		return this.service.removePathById(id);
	}
}

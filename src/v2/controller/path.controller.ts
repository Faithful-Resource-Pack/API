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
	 * Get the raw collection of paths
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
	@Security("discord", ["administrator"])
	public createPath(@Body() body: InputPath): Promise<Path> {
		return this.service.createPath(body);
	}

	/**
	 * Get path's use by internal ID (e.g. 6096bcd96fb8b)
	 * @param id Internal ID
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
	@Security("discord", ["administrator"])
	public updatePath(@URLPath() id: string, @Body() body: InputPath | Path): Promise<Path> {
		return this.service.updatePathById(id, {
			...body,
			id,
		});
	}

	/**
	 * Change one version to a new version (e.g. 1.17 -> 1.17.1)
	 * @param old_version version to replace
	 * @param new_version version to replace with
	 */
	@Put("versions/modify/{old_version}/{new_version}")
	@Security("bot")
	@Security("discord", ["administrator"])
	public modifyVersion(
		@URLPath() old_version: string,
		@URLPath() new_version: string,
	): Promise<WriteConfirmation> {
		return this.service.modifyVersion(old_version, new_version);
	}

	/**
	 * Add a version to existing paths
	 * @param body Version name, edition it belongs to, and reference version if needed
	 */
	@Post("versions/add")
	@Security("bot")
	@Security("discord", ["administrator"])
	public addVersion(@Body() body: PathNewVersionParam): Promise<WriteConfirmation> {
		return this.service.addVersion(body);
	}

	@Post("versions/remove")
	@Security("bot")
	@Security("discord", ["administrator"])
	public removeVersion(@Body() body: PathRemoveVersionParam): Promise<WriteConfirmation> {
		return this.service.removeVersion(body.version);
	}

	/**
	 * Delete use by internal id (e.g. 6096bcd96fb8b)
	 * @param id Internal ID
	 */
	@Delete("{id}")
	@Security("bot")
	@Security("discord", ["administrator"])
	public deleteUse(@URLPath() id: string): Promise<WriteConfirmation> {
		return this.service.removePathById(id);
	}
}

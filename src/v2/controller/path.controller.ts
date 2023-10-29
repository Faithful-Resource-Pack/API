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
import { Path, InputPath, Paths } from "../interfaces";
import PathService from "../service/path.service";

@Route("paths")
@Tags("Paths")
export class PathsController extends Controller {
	private readonly service: PathService = new PathService();

	/**
	 * Get the raw collection of paths
	 */
	@Get("raw")
	public async getRaw(): Promise<Paths> {
		return this.service.getRaw();
	}

	/**
	 * Creates new path
	 * @param body Input creation data
	 */
	@Post("")
	@Security("bot")
	@Security("discord", ["administrator"])
	public async createPath(@Body() body: InputPath): Promise<Path> {
		return this.service.createPath(body);
	}

	/**
	 * Get path's use by internal ID (e.g. 6096bcd96fb8b)
	 * @param {String} id Internal ID
	 */
	@Get("{id}")
	public async getPathById(id: string): Promise<Path> {
		return this.service.getPathById(id);
	}

	/**
	 * Update current path
	 * @param body Input data
	 */
	@Put("{id}")
	@Security("bot")
	@Security("discord", ["administrator"])
	public async updatePath(@URLPath() id: string, @Body() body: InputPath | Path): Promise<Path> {
		return this.service.updatePathById(id, {
			...body,
			id,
		});
	}

	@Put("versions/modify/{old_version}/{new_version}")
	@Security("bot")
	@Security("discord", ["administrator"])
	public async modifyVersion(@URLPath() old_version: string, @URLPath() new_version: string): Promise<void> {
		return this.service.modifyVersion(old_version, new_version);
	}

	/**
	 * Delete use by internal id (e.g. 6096bcd96fb8b)
	 * @param {String} id Internal ID
	 */
	@Delete("{id}")
	@Security("bot")
	@Security("discord", ["administrator"])
	public async deleteUse(@URLPath() id: string): Promise<void> {
		return this.service.removePathById(id);
	}
}

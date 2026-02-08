import {
	Body,
	Controller,
	Delete,
	Get,
	Post,
	Put,
	Route,
	Security,
	Tags,
	Path as URLPath,
} from "tsoa";
import { WriteConfirmation } from "firestorm-db";
import { InputPath, Path } from "../interfaces";
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

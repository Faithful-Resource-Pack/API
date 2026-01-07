import {
	Body,
	Controller,
	Delete,
	Get,
	Path as URLPath,
	Post,
	Put,
	Route,
	Security,
	Tags,
} from "tsoa";
import { WriteConfirmation } from "firestorm-db";
import { Use, Path, CreationUse, EntireUseToCreate } from "../interfaces";
import UseService from "../service/use.service";

@Route("uses")
@Tags("Uses")
export class UseController extends Controller {
	private readonly service = new UseService();

	/**
	 * Get all uses in the collection
	 */
	@Get("raw")
	public getRaw(): Promise<Record<string, Use>> {
		return this.service.getRaw();
	}

	/**
	 * Add a texture use with an already-known use ID
	 * @param body Texture use to create
	 */
	@Post("")
	@Security("discord", ["Administrator"])
	public createUse(@Body() body: Use): Promise<Use> {
		return this.service.createUse(body);
	}

	/**
	 * Append a use onto an existing texture
	 */
	@Post("{texture_id}")
	@Security("discord", ["Administrator"])
	public async appendUse(
		@URLPath() texture_id: string,
		@Body() body: EntireUseToCreate,
	): Promise<{ use: Use; paths: Path[] }> {
		const [use, paths] = await this.service.appendUse(texture_id, body);
		// return as object for easier usage
		return { use, paths };
	}

	/**
	 * Get a use's path by ID or name
	 * @param id_or_name Use ID or Use Name
	 */
	@Get("{id_or_name}/paths")
	public getPathUseByIdOrName(@URLPath() id_or_name: string): Promise<Path[]> {
		return this.service.getPathUseByIdOrName(id_or_name);
	}

	/**
	 * Get a use by ID or name
	 * @param id_or_name Use ID or Use Name
	 */
	@Get("{id_or_name}")
	public getUseByIdOrName(@URLPath() id_or_name: string): Promise<Use | Use[]> {
		return this.service.getUseByIdOrName(id_or_name);
	}

	/**
	 * Update texture use
	 * @param id Use ID
	 */
	@Put("{id}")
	@Security("discord", ["Administrator"])
	public changeUse(@URLPath() id: string, @Body() modifiedUse: CreationUse): Promise<Use> {
		return this.service.updateUse(id, modifiedUse);
	}

	/**
	 * Remove texture use along with its associated paths
	 * @param id Use ID
	 */
	@Delete("{id}")
	@Security("discord", ["Administrator"])
	public deleteUse(@URLPath() id: string): Promise<WriteConfirmation[]> {
		return this.service.removeUseById(id);
	}
}

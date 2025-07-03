import { Body, Controller, Delete, Get, Path, Post, Put, Route, Security, Tags } from "tsoa";
import { WriteConfirmation } from "firestorm-db";
import { Use, Uses, Paths, CreationUse, EntireUseToCreate } from "../interfaces";
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
	@Security("discord", ["administrator"])
	public createUse(@Body() body: Use): Promise<Use> {
		return this.service.createUse(body);
	}

	/**
	 * Append a use onto an existing texture
	 */
	@Post("{texture_id}")
	@Security("discord", ["administrator"])
	public appendUse(@Path() texture_id: string, @Body() body: EntireUseToCreate): Promise<void> {
		return this.service.appendUse(texture_id, body);
	}

	/**
	 * Get a use's path by ID or name
	 * @param id_or_name Use ID or Use Name
	 */
	@Get("{id_or_name}/paths")
	public getPathUseByIdOrName(@Path() id_or_name: string): Promise<Paths> {
		return this.service.getPathUseByIdOrName(id_or_name);
	}

	/**
	 * Get a use by ID or name
	 * @param id_or_name Use ID or Use Name
	 */
	@Get("{id_or_name}")
	public getUseByIdOrName(@Path() id_or_name: string): Promise<Use | Uses> {
		return this.service.getUseByIdOrName(id_or_name);
	}

	/**
	 * Update texture use
	 * @param id Use ID
	 */
	@Put("{id}")
	@Security("discord", ["administrator"])
	public changeUse(@Path() id: string, @Body() modifiedUse: CreationUse): Promise<Use> {
		return this.service.updateUse(id, modifiedUse);
	}

	/**
	 * Remove texture use along with its associated paths
	 * @param id Use ID
	 */
	@Delete("{id}")
	@Security("discord", ["administrator"])
	public deleteUse(@Path() id: string): Promise<WriteConfirmation[]> {
		return this.service.removeUseById(id);
	}
}

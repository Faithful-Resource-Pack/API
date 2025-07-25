import {
	Body,
	Controller,
	Delete,
	Get,
	Path,
	Post,
	Put,
	Query,
	Request,
	Response,
	Route,
	Security,
	SuccessResponse,
	Tags,
} from "tsoa";
import { Request as ExRequest } from "express";
import { WriteConfirmation } from "firestorm-db";
import {
	Contributions,
	Paths,
	Texture,
	Textures,
	Uses,
	Edition,
	PackID,
	TextureCreationParam,
	MCMETA,
	TextureProperty,
	TextureAll,
	TexturesAll,
	EntireTextureToCreate,
	AnyTextureProperty,
} from "../interfaces";
import TextureService from "../service/texture.service";
import { NotFoundError } from "../tools/errorTypes";

@Route("textures")
@Tags("Textures")
export class TextureController extends Controller {
	private readonly service = new TextureService();

	/**
	 * Get all textures in the collection
	 */
	@Get("raw")
	public getRaw(): Promise<Record<string, Texture>> {
		return this.service.getRaw();
	}

	/**
	 * Get Minecraft editions supported by the database
	 */
	@Get("editions")
	public getEditions(): Promise<string[]> {
		return this.service.getEditions();
	}

	/**
	 * Get all the tags from all textures (Block, UI, etc)
	 */
	@Get("tags")
	public getTags(): Promise<string[]> {
		return this.service.getTags();
	}

	/**
	 * Get all pack resolutions in the database
	 * @returns Array of pack resolutions
	 */
	@Get("resolutions")
	public getResolutions(): Promise<number[]> {
		return this.service.getResolutions();
	}

	/**
	 * Get all animated textures in the database
	 * @returns Array of texture IDs
	 */
	@Get("animated")
	public getAnimated(): Promise<number[]> {
		return this.service.getAnimated();
	}

	/**
	 * Get all existing Minecraft versions supported in the database
	 */
	@Get("versions")
	public getVersions(): Promise<string[]> {
		return this.service.getVersions();
	}

	/**
	 * Get all existing Minecraft versions for a given edition
	 * @param edition Existing edition inside the settings collection
	 */
	@Get("versions/{edition}")
	public getVersionByEdition(@Path() edition: Edition): Promise<string[]> {
		return this.service.getVersionByEdition(edition);
	}

	/**
	 * Search a texture by name or tag
	 * @param tag Tag to search by
	 * @param name Name to search by
	 */
	@Get("search")
	public searchTexture(@Query() name?: string, @Query() tag?: string): Promise<Textures> {
		return this.service.search(name, tag, true);
	}

	/**
	 * Get a texture by ID or name
	 * @param id_or_name Texture ID or texture name (join by "," if multiple)
	 */
	@Get("{id_or_name}")
	public getTexture(@Path() id_or_name: string | number): Promise<Texture | Textures> {
		if (typeof id_or_name === "string" && id_or_name.includes(",")) {
			const idArray = id_or_name.split(",");
			return Promise.allSettled(idArray.map((id) => this.service.getByNameOrId(id))).then((res) =>
				res.filter((p) => p.status === "fulfilled").flatMap((p) => p.value),
			);
		}
		return this.service.getByNameOrId(id_or_name);
	}

	/**
	 * Get more information about all textures that have the given string in their name
	 * @param id_or_name Texture search by name or id (join by ',' if multiple)
	 * @param property Property from the texture
	 */
	@Get("{id_or_name}/{property}")
	public getTextureProperty(
		@Path() id_or_name: string | number,
		@Path() property: TextureProperty,
	): Promise<AnyTextureProperty | AnyTextureProperty[]> {
		if (typeof id_or_name === "string" && id_or_name.includes(",")) {
			const idArray = id_or_name.split(",");
			return Promise.allSettled(
				idArray.map((id) => this.service.searchProperty(id, property)),
			).then((res) => res.filter((p) => p.status === "fulfilled").map((p) => p.value));
		}

		return this.service.searchProperty(id_or_name, property);
	}

	/**
	 * Get GitHub URL based on specified parameters
	 * @param id Texture ID
	 * @param pack Pack to search from
	 * @param mc_version Version to choose from ('latest' to always get the latest version where texture exists)
	 */
	@Response<NotFoundError>(404)
	@Get("{id}/url/{pack}/{mc_version}")
	@SuccessResponse(302, "Redirect")
	public async getTextureURL(
		@Path() id: string,
		@Path() pack: PackID,
		@Path() mc_version: string,
		@Request() request: ExRequest,
	): Promise<void> {
		const url = await this.service.getURLById(parseInt(id, 10), pack, mc_version);
		request.res?.redirect(url);
	}

	/**
	 * Merge two textures together
	 * @param source Texture to take existing uses from (will be deleted)
	 * @param destination Texture to keep
	 */
	@Put("merge/{source}/{destination}")
	@Security("bot")
	@Security("discord", ["administrator"])
	public mergeTextures(@Path() source: string, @Path() destination: string): Promise<void> {
		return this.service.mergeTextures(source, destination);
	}

	/**
	 * Create a texture
	 * @param body Texture information
	 */
	@Post("")
	@Security("bot")
	@Security("discord", ["administrator"])
	public createTexture(@Body() body: TextureCreationParam): Promise<Texture> {
		return this.service.createTexture(body);
	}

	/**
	 * Create multiple textures at once
	 * @param body Texture information
	 */
	@Post("multiple")
	@Security("bot")
	@Security("discord", ["administrator"])
	public createMultipleTextures(@Body() body: EntireTextureToCreate[]): Promise<Textures> {
		return this.service.createEntireTextures(body);
	}

	/**
	 * Edit an existing texture
	 * @param id Texture ID
	 * @param body Texture information
	 */
	@Put("{id}")
	@Security("bot")
	@Security("discord", ["administrator"])
	public editTexture(@Path() id: string, @Body() body: TextureCreationParam): Promise<Texture> {
		return this.service.editTexture(id, body);
	}

	/**
	 * Deletes the ENTIRE texture, with uses and paths included
	 * @param id Texture ID
	 */
	@Delete("{id}")
	@Security("bot")
	@Security("discord", ["administrator"])
	public deleteTexture(id: string): Promise<WriteConfirmation[]> {
		return this.service.deleteTexture(id);
	}
}

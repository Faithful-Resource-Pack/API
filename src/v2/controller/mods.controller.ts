import { Request as ExRequest } from "express";
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
	Route,
	Security,
	SuccessResponse,
	Tags,
} from "tsoa";
import {
	Mod,
	ModContribution,
	BlacklistBody,
	ModMergedBody,
	ModMergedResult,
	ModUpdateBody,
	ModMergeCandidate,
	ModRemoval,
	ModTexture,
	ModTextureAliasesBody,
	ModTextureDistinctBody,
	ModTextureMergeBody,
	ModVersion,
	ModVersionTexture,
	PickableMod,
} from "../interfaces";
import ModContributionService from "../service/modContribution.service";
import ModsService from "../service/mods.service";
import ModTextureMergeService from "../service/modTextureMerge.service";

@Route("mods")
@Tags("Mods")
export class ModsController extends Controller {
	private readonly service = new ModsService();

	/**
	 * Get all mods in the collection
	 */
	@Get("raw")
	public getRaw(): Promise<Record<string, Mod>> {
		return this.service.getRaw();
	}

	/**
	 * Get the Minecraft versions a resource pack can be built for, newest first
	 */
	@Get("minecraft")
	public getMinecraftVersions(): Promise<string[]> {
		return this.service.getPickerMinecraftVersions();
	}

	/**
	 * Get the mods a resource pack can be built for, with the version it would use
	 * @param pack Pack ID
	 * @param minecraft Minecraft version
	 */
	@Get("pickable")
	public getPickable(@Query() pack: string, @Query() minecraft: string): Promise<PickableMod[]> {
		return this.service.getPickable(pack, minecraft);
	}

	/**
	 * Search for mods by property (AND logic, needs to match all criteria to be shown)
	 * @param name Part of the mod name to search by
	 * @param slug Exact mod slug to search by
	 * @param blacklisted Whether to only show (or hide) blacklisted mods
	 */
	@Get("search")
	public search(
		@Query() name?: string,
		@Query() slug?: string,
		@Query() blacklisted?: boolean,
	): Promise<Mod[]> {
		return this.service.search({ name, slug, blacklisted });
	}

	/**
	 * Get a mod by ID
	 * @param id Mod ID
	 */
	@Get("{id}")
	public getById(@Path() id: string): Promise<Mod> {
		return this.service.getById(id);
	}

	/**
	 * Delete a mod with its versions and indexed contributions
	 * @param id Mod ID
	 */
	@Delete("{id}")
	@Security("bot")
	@Security("discord", ["Administrator"])
	public remove(@Path() id: string): Promise<ModRemoval> {
		return this.service.removeMod(id);
	}

	/**
	 * Change the name, aliases, version format, icon or blacklist state of a mod
	 * @param id Mod ID
	 * @param body Fields to change
	 */
	@Put("{id}")
	@Security("bot")
	@Security("discord", ["Administrator"])
	public update(@Path() id: string, @Body() body: ModUpdateBody): Promise<Mod> {
		return this.service.updateMod(id, body);
	}

	/**
	 * Get all the versions of a mod
	 * @param id Mod ID
	 */
	@Get("{id}/versions")
	public getVersions(@Path() id: string): Promise<ModVersion[]> {
		return this.service.getVersions(id);
	}

	/**
	 * Get the IDs of the versions of a mod that contain a texture
	 * @param id Mod ID
	 * @param texture_id Mod texture ID
	 */
	@Get("{id}/textures/{texture_id}/versions")
	public getTextureVersions(@Path() id: string, @Path() texture_id: string): Promise<string[]> {
		return this.service.getTextureVersionIds(id, texture_id);
	}

	/**
	 * Get the contributions of the textures a mod uses
	 * @param id Mod ID
	 * @param pack Pack ID to filter by
	 * @param texture_id Mod texture ID to filter by
	 */
	@Get("{id}/contributions")
	public getContributions(
		@Path() id: string,
		@Query() pack?: string,
		@Query() texture_id?: string,
	): Promise<ModContribution[]> {
		return this.service.getContributions(id, { pack, texture_id });
	}
}

@Route("mod-versions")
@Tags("Mods")
export class ModVersionsController extends Controller {
	private readonly service = new ModsService();

	/**
	 * Get a mod version by ID
	 * @param id Mod version ID
	 */
	@Get("{id}")
	public getById(@Path() id: string): Promise<ModVersion> {
		return this.service.getVersionById(id);
	}

	/**
	 * Delete a mod version with the contributions made on its branch
	 * @param id Mod version ID
	 */
	@Delete("{id}")
	@Security("bot")
	@Security("discord", ["Administrator"])
	public remove(@Path() id: string): Promise<ModRemoval> {
		return this.service.removeVersion(id);
	}

	/**
	 * Allow or forbid contributions on a mod version
	 * @param id Mod version ID
	 * @param body Blacklist state
	 */
	@Put("{id}")
	@Security("bot")
	@Security("discord", ["Administrator"])
	public setBlacklisted(@Path() id: string, @Body() body: BlacklistBody): Promise<ModVersion> {
		return this.service.setVersionBlacklisted(id, body);
	}

	/**
	 * Get the default textures of a mod version, with their image urls
	 * @param id Mod version ID
	 */
	@Get("{id}/textures")
	public getTextures(@Path() id: string): Promise<ModVersionTexture[]> {
		return this.service.getVersionTextures(id);
	}

	/**
	 * Get the textures of a mod version that have the same path as a different texture of the mod's
	 * other versions, so an admin can decide to merge them
	 * @param id Mod version ID
	 */
	@Get("{id}/merge-candidates")
	@Security("bot")
	@Security("discord", ["Administrator"])
	public getMergeCandidates(@Path() id: string): Promise<ModMergeCandidate[]> {
		return new ModTextureMergeService().getCandidates(id);
	}

	/**
	 * Get the image of a default texture of a mod version
	 * @param id Mod version ID
	 * @param textureId Mod texture ID
	 */
	@Get("{id}/textures/{textureId}/image")
	@SuccessResponse(200, "PNG image")
	public async getTextureImage(
		@Path() id: string,
		@Path() textureId: string,
		@Request() request: ExRequest,
	): Promise<void> {
		const image = await this.service.getVersionTextureImage(id, textureId);
		request.res?.type("png").set("Cache-Control", "public, max-age=3600").send(image);
	}
}

@Route("mod-textures")
@Tags("Mods")
export class ModTexturesController extends Controller {
	private readonly service = new ModsService();

	/**
	 * Get a mod texture asset by ID
	 * @param id Mod texture ID
	 */
	@Get("{id}")
	public getById(@Path() id: string): Promise<ModTexture> {
		return this.service.getTextureById(id);
	}

	/**
	 * Allow or forbid contributions on a mod texture
	 * @param id Mod texture ID
	 * @param body Blacklist state
	 */
	@Put("{id}")
	@Security("bot")
	@Security("discord", ["Administrator"])
	public setBlacklisted(@Path() id: string, @Body() body: BlacklistBody): Promise<ModTexture> {
		return this.service.setTextureBlacklisted(id, body);
	}

	/**
	 * Merge mod textures into the first one, which keeps every path, hash, name and contribution
	 * @param body IDs of the textures, the first one is kept
	 */
	@Post("merge")
	@Security("bot")
	@Security("discord", ["Administrator"])
	public merge(@Body() body: ModTextureMergeBody): Promise<ModTexture> {
		return new ModTextureMergeService().merge(body);
	}

	/**
	 * Remember that mod textures are different, so they aren't suggested for a merge again
	 * @param body Pairs of texture IDs
	 */
	@Post("distinct")
	@Security("bot")
	@Security("discord", ["Administrator"])
	public async setDistinct(@Body() body: ModTextureDistinctBody): Promise<void> {
		await new ModTextureMergeService().setDistinct(body);
	}

	/**
	 * Set the other names of a mod texture
	 * @param id Mod texture ID
	 * @param body Aliases, replacing the current ones
	 */
	@Put("{id}/aliases")
	@Security("bot")
	@Security("discord", ["Administrator"])
	public setAliases(@Path() id: string, @Body() body: ModTextureAliasesBody): Promise<ModTexture> {
		return this.service.setTextureAliases(id, body);
	}

	/**
	 * Say a mod texture is identical to a vanilla texture, so it uses its contributions
	 * @param id Mod texture ID
	 * @param body Vanilla texture ID, null to remove the link
	 */
	@Put("{id}/vanilla")
	@Security("bot")
	@Security("discord", ["Administrator"])
	public setVanilla(
		@Path() id: string,
		@Body() body: { texture_id: number | null },
	): Promise<ModTexture> {
		return this.service.setTextureVanilla(id, body.texture_id);
	}
}

@Route("mod-contributions")
@Tags("Mods")
export class ModContributionsController extends Controller {
	private readonly service = new ModContributionService();

	/**
	 * Index the textures changed by a merged pull request and copy them to every mod version using them.
	 * Called by the CI of the pack repositories.
	 * @param body Pack and pull request number
	 */
	@Post("merged")
	@Security("bot")
	public registerMerged(@Body() body: ModMergedBody): Promise<ModMergedResult> {
		return this.service.registerMerged(body);
	}

	/**
	 * Remove a contribution from the index
	 * @param id Mod contribution ID
	 */
	@Delete("{id}")
	@Security("bot")
	@Security("discord", ["Administrator"])
	public async remove(@Path() id: string): Promise<void> {
		await this.service.remove(id);
	}
}

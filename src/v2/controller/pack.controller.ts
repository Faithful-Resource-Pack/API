import { Body, Controller, Delete, Get, Path, Post, Put, Query, Route, Security, Tags } from "tsoa";
import { WriteConfirmation } from "firestorm-db";
import PackService from "../service/pack.service";
import { CreationPackAll, Pack, PackAll, PackID, PackType } from "../interfaces";

@Route("packs")
@Tags("Packs")
export class PackController extends Controller {
	private readonly service = new PackService();

	/**
	 * Get all packs in the collection
	 */
	@Get("raw")
	public getRaw(): Promise<Record<string, Pack>> {
		return this.service.getRaw();
	}

	/**
	 * Get all the tags from all packs (faithful, progart, etc)
	 */
	@Get("tags")
	public getAllTags(): Promise<string[]> {
		return this.service.getAllTags();
	}

	/**
	 * Search for packs by property (AND logic, needs to match all criteria to be shown)
	 * @param tag Pack tag to search by
	 * @param name Display name to search by
	 * @param resolution Resolution to search by
	 */
	@Get("search")
	public searchPacks(
		@Query() tag?: string,
		@Query() name?: string,
		@Query() resolution?: number,
		@Query() type?: PackType,
	): Promise<Pack[]> {
		return this.service.search({ tag, name, resolution, type });
	}

	/**
	 * Get a pack by ID
	 * @param pack_id Supported pack
	 */
	@Get("{pack_id}")
	public getPack(@Path() pack_id: PackID): Promise<Pack> {
		return this.service.getById(pack_id);
	}

	/**
	 * Change a pack ID and all its contributions if possible
	 * @param old_pack Pack ID to replace
	 * @param new_pack Pack ID to replace with
	 */
	@Put("rename/{old_pack}/{new_pack}")
	@Security("bot")
	@Security("discord", ["Administrator"])
	public renamePack(
		@Path() old_pack: PackID,
		@Path() new_pack: string,
	): Promise<WriteConfirmation> {
		return this.service.renamePack(old_pack, new_pack);
	}

	/**
	 * Get a pack and its associated submission information by ID
	 * @param pack_id Pack ID
	 */
	@Get("{pack_id}/all")
	public getWithSubmission(@Path() pack_id: PackID): Promise<PackAll> {
		return this.service.getWithSubmission(pack_id);
	}

	/**
	 * Create a pack, or a pack and submission at the same time
	 * @param body Pack (or pack and submission) to add
	 */
	@Post("")
	@Security("bot")
	@Security("discord", ["Administrator"])
	public create(@Body() body: CreationPackAll): Promise<CreationPackAll> {
		return this.service.create(body);
	}

	/**
	 * Edit an existing pack
	 * @param id Pack ID
	 * @param body Pack information
	 */
	@Put("{id}")
	@Security("bot")
	@Security("discord", ["Administrator"])
	public update(@Path() id: PackID, @Body() body: Pack): Promise<Pack> {
		return this.service.update(id, body);
	}

	/**
	 * Deletes the entire pack, including associated submission information
	 * @param id Pack ID
	 */
	@Delete("{id}")
	@Security("bot")
	@Security("discord", ["Administrator"])
	public remove(id: PackID): Promise<WriteConfirmation> {
		return this.service.remove(id);
	}
}

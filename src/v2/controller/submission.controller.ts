import { Body, Controller, Delete, Get, Path, Post, Put, Route, Security, Tags } from "tsoa";
import { WriteConfirmation } from "firestorm-db";
import SubmissionService from "../service/submission.service";
import { CreationSubmission, PackAll, PackID, Submission } from "../interfaces";

@Route("submissions")
@Tags("Submissions")
export class SubmissionController extends Controller {
	private readonly service = new SubmissionService();

	/**
	 * Get all submittable packs in the collection
	 */
	@Get("raw")
	public getRaw(): Promise<Record<string, Submission>> {
		return this.service.getRaw();
	}

	/**
	 * Get all submittable packs with their main pack information
	 */
	@Get("all")
	public getEveryPack(): Promise<Record<PackID, PackAll>> {
		return this.service.getEveryPack();
	}

	/**
	 * Get a submission pack by ID
	 */
	@Get("{pack_id}")
	public getPack(@Path() pack_id: PackID): Promise<Submission> {
		return this.service.getById(pack_id);
	}

	/**
	 * Add submission support to an existing pack
	 * @param body Pack information
	 */
	@Post("")
	@Security("bot")
	@Security("discord", ["Administrator"])
	public createPack(@Body() body: CreationSubmission): Promise<Submission> {
		return this.service.create(body.id, body);
	}

	/**
	 * Edit an existing submission pack
	 * @param id Pack ID to edit
	 * @param body Pack information
	 */
	@Put("{id}")
	@Security("bot")
	@Security("discord", ["Administrator"])
	public update(@Path() id: PackID, @Body() body: Submission): Promise<Submission> {
		return this.service.update(id, body);
	}

	/**
	 * Deletes the submission pack entry (effectively converts a submission pack to a regular pack)
	 * @param id Pack ID
	 */
	@Delete("{id}")
	@Security("bot")
	@Security("discord", ["Administrator"])
	public remove(id: PackID): Promise<WriteConfirmation> {
		return this.service.remove(id);
	}
}

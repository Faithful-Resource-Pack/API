import { Body, Controller, Delete, Get, Path, Post, Put, Route, Security, Tags } from "tsoa";
import { SubmissionService } from "../service/submission.service";
import { CreationSubmission, FaithfulPack, Submission } from "../interfaces";

@Route("submissions")
@Tags("Submissions")
export class SubmissionController extends Controller {
	private readonly service = new SubmissionService();

	/**
	 * Get the raw collection of submittable packs
	 */
	@Get("raw")
	public async getRaw(): Promise<Record<string, Submission>> {
		return this.service.getRaw();
	}

	/**
	 * Get a submission pack by ID
	 */
	@Get("{pack_id}")
	public async getPack(@Path() pack_id: FaithfulPack): Promise<Submission> {
		return this.service.getById(pack_id);
	}

	/**
	 * Add submission support to an existing pack
	 * @param body Pack information
	 */
	@Post("")
	@Security("bot")
	@Security("discord", ["administrator"])
	public async createPack(@Body() body: CreationSubmission): Promise<Submission> {
		return this.service.create(body.id, body);
	}

	/**
	 * Edit an existing submission pack
	 * @param id pack ID
	 * @param body Pack information
	 */
	@Put("{id}")
	@Security("bot")
	@Security("discord", ["administrator"])
	public async update(@Path() id: FaithfulPack, @Body() body: Submission): Promise<Submission> {
		return this.service.update(id, body);
	}

	/**
	 * Deletes the entire pack
	 * @param id pack ID
	 */
	@Delete("{id}")
	@Security("bot")
	@Security("discord", ["administrator"])
	public async delete(id: FaithfulPack): Promise<void> {
		return this.service.delete(id);
	}
}

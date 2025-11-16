import { WriteConfirmation } from "firestorm-db";
import { Submission, CreationSubmission, PackID, PackAll } from "../interfaces";
import * as SubmissionRepo from "../repository/submission.repository";
import { BadRequestError } from "../tools/errorTypes";
import PackService from "./pack.service";

export default class SubmissionService {
	private readonly packService = new PackService();

	public getRaw(): Promise<Record<string, Submission>> {
		return SubmissionRepo.getRaw();
	}

	public getEveryPack(): Promise<Record<PackID, PackAll>> {
		return SubmissionRepo.getEveryPack();
	}

	public getById(id: PackID): Promise<Submission> {
		return SubmissionRepo.getById(id);
	}

	public async create(id: PackID, pack: CreationSubmission): Promise<Submission> {
		await this.packService.getById(id); // verify parent pack exists already
		return SubmissionRepo.create(id, pack);
	}

	public async update(id: PackID, pack: Submission): Promise<Submission> {
		if (id !== pack.id) throw new BadRequestError("Updated ID is different from ID");

		await this.packService.getById(id); // verify parent pack exists already
		return SubmissionRepo.update(id, pack);
	}

	public remove(id: PackID): Promise<WriteConfirmation> {
		return SubmissionRepo.remove(id);
	}
}

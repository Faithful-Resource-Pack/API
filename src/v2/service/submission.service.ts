import { WriteConfirmation } from "firestorm-db";
import { CreationSubmission, PackAll, PackID, Submission } from "../interfaces";
import SubmissionFirestormRepository from "../repository/submission.repository";
import { BadRequestError } from "../tools/errorTypes";
import PackService from "./pack.service";

export default class SubmissionService {
	private readonly packService = new PackService();

	private readonly repo = new SubmissionFirestormRepository();

	public getRaw(): Promise<Record<string, Submission>> {
		return this.repo.getRaw();
	}

	public getEveryPack(): Promise<Record<PackID, PackAll>> {
		return this.repo.getEveryPack();
	}

	public getById(id: PackID): Promise<Submission> {
		return this.repo.getById(id);
	}

	public async create(id: PackID, pack: CreationSubmission): Promise<Submission> {
		await this.packService.getById(id); // verify parent pack exists already
		return this.repo.create(id, pack);
	}

	public async update(id: PackID, pack: Submission): Promise<Submission> {
		if (id !== pack.id) throw new BadRequestError("Updated ID is different from ID");

		await this.packService.getById(id); // verify parent pack exists already
		return this.repo.update(id, pack);
	}

	public remove(id: PackID): Promise<WriteConfirmation> {
		return this.repo.remove(id);
	}
}

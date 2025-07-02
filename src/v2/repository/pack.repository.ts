import { ID_FIELD, SearchOption, WriteConfirmation } from "firestorm-db";
import {
	PackRepository,
	Pack,
	Packs,
	CreationPack,
	PackAll,
	PackID,
	CreationPackAll,
	PackSearch,
	FirestormPack,
} from "../interfaces";
import { contributions, packs } from "../firestorm";
import SubmissionFirestormRepository from "./submission.repository";

export default class PackFirestormRepository implements PackRepository {
	private readonly submissionRepo = new SubmissionFirestormRepository();

	getRaw(): Promise<Record<string, Pack>> {
		return packs.readRaw();
	}

	getById(id: string): Promise<Pack> {
		return packs.get(id);
	}

	async getWithSubmission(id: PackID): Promise<PackAll> {
		const pack = await packs.get(id);
		const submission = await this.submissionRepo.getById(id).catch<null>(() => null);
		return { ...pack, submission: submission || {} };
	}

	async getAllTags(): Promise<string[]> {
		const tags = await packs.values({ field: "tags", flatten: true });
		return tags.sort();
	}

	async search(params: PackSearch): Promise<Packs> {
		const { tag, name, resolution, type } = params;
		const options: SearchOption<Pack>[] = [];
		if (name)
			options.push({
				field: "name",
				criteria: "==",
				value: name,
				ignoreCase: true,
			});
		if (tag)
			options.push({
				field: "tags",
				criteria: "array-contains",
				value: tag,
			});
		if (resolution)
			options.push({
				field: "resolution",
				criteria: "==",
				value: resolution,
			});

		// calling Object.values as a callback gets rid of type inference
		const searchPromise = options.length
			? packs.search(options)
			: packs.readRaw().then((res) => Object.values(res));

		const searched = await searchPromise;
		if (!type || type === "all") return searched;

		const out = (
			await Promise.all(
				searched.map<Promise<FirestormPack>>((pack) =>
					pack
						.submission()
						.then(() => pack)
						.catch(() => undefined),
				),
			)
		).filter((pack) => pack !== undefined);

		if (type === "submission") return out;
		return searched.filter((p) => !out.includes(p));
	}

	async renamePack(oldPack: PackID, newPack: string): Promise<void> {
		const data: CreationPackAll = await this.getById(oldPack);
		data.id = newPack;
		const submission = await this.submissionRepo.getById(oldPack).catch<null>(() => null);
		if (submission) data.submission = submission;
		this.remove(oldPack);
		this.submissionRepo.remove(oldPack);
		this.create(newPack, data);
	}

	async create(packId: string, data: CreationPackAll): Promise<CreationPackAll> {
		const out = {} as CreationPackAll;
		if (data.submission) {
			// submission is stored separately so we split it from the main payload
			const submissionData = { id: packId, ...data.submission };
			delete data.submission;
			const submission = await this.submissionRepo.create(packId, submissionData);
			out.submission = submission;
		}

		await packs.set(packId, data);
		return { id: packId, ...data, ...out };
	}

	async update(packId: PackID, newPack: CreationPack): Promise<Pack> {
		await packs.set(packId, newPack);
		return packs.get(packId);
	}

	async remove(packId: PackID): Promise<WriteConfirmation> {
		// try removing submission data if exists too
		this.submissionRepo.remove(packId).catch(() => {});

		// remove associated contributions
		const contribs = await contributions.search([
			{
				field: "pack",
				criteria: "==",
				value: packId,
			},
		]);
		await contributions.removeBulk(contribs.map((c) => c[ID_FIELD]));
		return packs.remove(packId);
	}
}

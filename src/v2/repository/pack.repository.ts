import { ID_FIELD, SearchOption, WriteConfirmation } from "firestorm-db";
import {
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
import * as SubmissionRepo from "./submission.repository";

export function getRaw(): Promise<Record<string, Pack>> {
	return packs.readRaw();
}

export function getById(id: string): Promise<Pack> {
	return packs.get(id);
}

export async function getWithSubmission(id: PackID): Promise<PackAll> {
	const pack = await packs.get(id);
	const submission = await SubmissionRepo.getById(id).catch<null>(() => null);
	return { ...pack, submission: submission || {} };
}

export async function getAllTags(): Promise<string[]> {
	const tags = await packs.values({ field: "tags", flatten: true });
	return tags.sort();
}

export async function search(params: PackSearch): Promise<Packs> {
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
			searched.map<Promise<FirestormPack | null>>((pack) =>
				pack
					.submission()
					.then(() => pack)
					.catch(() => null),
			),
		)
	).filter((pack) => pack !== null);

	if (type === "submission") return out;
	return searched.filter((p) => !out.includes(p));
}

export async function renamePack(
	oldPack: PackID,
	newPack: string,
): Promise<[WriteConfirmation, WriteConfirmation, CreationPackAll]> {
	const data: CreationPackAll = await getById(oldPack);
	data.id = newPack;
	const submission = await SubmissionRepo.getById(oldPack).catch<null>(() => null);
	if (submission) data.submission = submission;
	return Promise.all([remove(oldPack), SubmissionRepo.remove(oldPack), create(newPack, data)]);
}

export async function create(packId: string, data: CreationPackAll): Promise<CreationPackAll> {
	const out: Partial<CreationPackAll> = {};
	if (data.submission) {
		// submission is stored separately so we split it from the main payload
		const submissionData = { id: packId, ...data.submission };
		delete data.submission;
		const submission = await SubmissionRepo.create(packId, submissionData);
		out.submission = submission;
	}

	await packs.set(packId, data);
	return { id: packId, ...data, ...out };
}

export async function update(packId: PackID, newPack: CreationPack): Promise<Pack> {
	await packs.set(packId, newPack);
	return packs.get(packId);
}

export async function remove(packId: PackID): Promise<WriteConfirmation> {
	// try removing submission data if exists too
	SubmissionRepo.remove(packId).catch(() => {});

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

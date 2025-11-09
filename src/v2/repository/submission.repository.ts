import { WriteConfirmation } from "firestorm-db";
import { Submission, CreationSubmission, PackAll, PackID } from "../interfaces";
import { submissions } from "../firestorm/packs/submissions";
import { packs } from "../firestorm/packs";

export function getRaw(): Promise<Record<string, Submission>> {
	return submissions.readRaw();
}

export function getById(id: PackID): Promise<Submission> {
	return submissions.get(id);
}

export async function getEveryPack(): Promise<Record<PackID, PackAll>> {
	const submissionPacks = await submissions.readRaw();
	const fullPackPromises = Object.values(submissionPacks).map(async (p) => ({
		...(await packs.get(p.id)),
		submission: p,
	}));

	const fullPack = await Promise.all(fullPackPromises);
	return fullPack.reduce<Record<PackID, PackAll>>((acc, cur) => {
		acc[cur.id] = cur;
		return acc;
	}, {});
}

export async function create(
	packId: string,
	packToCreate: CreationSubmission,
): Promise<Submission> {
	await submissions.set(packId, packToCreate);
	return submissions.get(packId);
}

export async function update(packId: PackID, newPack: Submission): Promise<Submission> {
	await submissions.set(packId, newPack);
	return submissions.get(packId);
}

export function remove(packId: PackID): Promise<WriteConfirmation> {
	return submissions.remove(packId);
}

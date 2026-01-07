import { WriteConfirmation } from "firestorm-db";
import { PackAll, PackID } from "./packs";

export interface SubmissionChannels {
	submit: string;
	results: string;
}

export interface FirstCreationSubmission {
	// when created at the same time as pack, id isn't required (duplicated otherwise)
	id?: string;
	reference: PackID | null;
	channels: SubmissionChannels;
	time_to_results: number;
	contributor_role?: string;
}

export interface CreationSubmission extends FirstCreationSubmission {
	// adding submission pack separately needs parent pack
	id: PackID;
}

export interface Submission extends CreationSubmission {
	id: PackID;
}

export interface FirestormSubmission extends Submission {}

export interface SubmissionRepository {
	getRaw(): Promise<Record<string, Submission>>;
	getEveryPack(): Promise<Record<PackID, PackAll>>;
	getById(id: PackID): Promise<Submission>;
	create(packId: PackID, packToCreate: Submission): Promise<Submission>;
	update(packId: PackID, newPack: Submission): Promise<Submission>;
	remove(packId: PackID): Promise<WriteConfirmation>;
}

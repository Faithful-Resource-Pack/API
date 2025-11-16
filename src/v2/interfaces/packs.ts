import { FirstCreationSubmission, Submission } from "./submissions";
import { Edition } from "./textures";

// this way you don't have to add a new pack every time a new one gets created
export type PackID = string;

export interface PackGitHub {
	repo: string;
	org: string;
}

export type PackType = "submission" | "default" | "all";

export type PackSearch = Partial<{
	tag: string;
	name: string;
	resolution: number;
	type: PackType;
}>;

export interface CreationPack {
	// either can be specified manually or serialized automatically
	id?: string;
	name: string;
	tags: string[];
	color: string;
	logo: string;
	resolution: number;
	// not all editions are required
	github: Partial<Record<Edition, PackGitHub>>;
}

export interface Pack extends CreationPack {
	// override since now you know what packs exist
	id: PackID;
}

export interface PackAll extends Pack {
	// https://www.totaltypescript.com/the-empty-object-type-in-typescript
	submission: Submission | Record<string, never>;
}

export interface CreationPackAll extends CreationPack {
	submission?: FirstCreationSubmission;
}

export type Packs = Pack[];

export interface FirestormPack extends Pack {
	submission(): Promise<Submission>;
}

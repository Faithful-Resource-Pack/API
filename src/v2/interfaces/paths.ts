import { WriteConfirmation } from "firestorm-db";
import { Edition } from "./textures";

export interface CreationPath {
	name: string; // texture path ('textures/block/stone.png')
	versions: string[]; // MC versions
	mcmeta: boolean; // true if animated
}

export interface InputPath extends CreationPath {
	use: string; // use id
}

export interface Path extends InputPath {
	id: string; // path unique id
}

export type Paths = Path[];

export interface FirestormPath extends Path {}

export interface PathNewVersionParam {
	edition: Edition;
	version: string;
	newVersion: string;
}

export interface PathRemoveVersionParam {
	version: string;
}

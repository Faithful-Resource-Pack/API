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

export interface PathRepository {
	getRaw(): Promise<Record<string, Path>>;
	getPathById(pathID: string): Promise<Path>;
	getPathUseById(useID: string): Promise<Paths>;
	getPathsByUseIdsAndVersion(useIDs: string[], version: string): Promise<Paths>;
	createPath(path: InputPath): Promise<Path>;
	createPathBulk(paths: InputPath[]): Promise<Paths>;
	updatePath(pathID: string, path: Path): Promise<Path>;
	renameVersion(oldVersion: string, newVersion: string): Promise<WriteConfirmation>;
	removeVersion(version: string): Promise<WriteConfirmation>;
	addNewVersionToVersion(version: string, newVersion: string): Promise<WriteConfirmation>;
	removePathById(pathID: string): Promise<WriteConfirmation>;
	removePathsByBulk(pathIDs: string[]): Promise<WriteConfirmation>;
}

export interface PathNewVersionParam {
	edition: Edition;
	version: string;
	newVersion: string;
}

export interface PathRemoveVersionParam {
	version: string;
}

import { WriteConfirmation } from "firestorm-db";
import { CreationPath, FirestormPath } from "./paths";
import { GalleryEdition } from "./gallery";
import { Edition } from "./textures";

export interface BaseUse {
	name: string; // use name
	edition: Edition; // game edition
}

export interface CreationUse extends BaseUse {
	texture: number; // texture id
}

export interface EntireUseToCreate extends BaseUse {
	// only needed when making uses + paths after texture creation
	texture?: number;
	paths: CreationPath[]; // all the paths to be created
}

export interface Use extends CreationUse {
	id: string; // use unique id
}

export type Uses = Use[];

export interface FirestormUse extends Use {
	getPaths(): Promise<FirestormPath[]>;
}

export interface UseRepository {
	getUsesByIdsAndEdition(idArr: number[], edition: GalleryEdition): Promise<Uses>;
	getRaw(): Promise<Record<string, Use>>;
	getUseByIdOrName(idOrName: string): Promise<Uses | Use>;
	lastCharCode(textureID: string): Promise<number>;
	deleteUse(id: string): Promise<WriteConfirmation[]>;
	set(use: Use): Promise<Use>;
	setMultiple(uses: Uses): Promise<Uses>;
	removeUseById(useID: string): Promise<[WriteConfirmation, WriteConfirmation]>;
	removeUsesByBulk(useIDs: string[]): Promise<[WriteConfirmation, WriteConfirmation][]>;
}

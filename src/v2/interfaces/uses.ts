import { WriteConfirmation } from "firestorm-db";
import { CreationPath, FirestormPath } from "./paths";
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

export interface FirestormUse extends Use {
	getPaths(): Promise<FirestormPath[]>;
}

export interface UseRepository {
	getRaw(): Promise<Record<string, Use>>;
	getUseById(id: string | number): Promise<Use>;
	getUseByIdOrName(idOrName: string): Promise<Use[] | Use>;
	getUsesByIds(idArr: number[]): Promise<Use[]>;
	lastCharCode(textureID: string): Promise<number>;
	set(use: Use): Promise<Use>;
	setMultiple(uses: Use[]): Promise<Use[]>;
	removeUseById(useID: string): Promise<[WriteConfirmation, WriteConfirmation]>;
	removeUsesByBulk(useIDs: string[]): Promise<[WriteConfirmation, WriteConfirmation][]>;
}

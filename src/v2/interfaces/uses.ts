import { CreationPath } from "./paths";

export interface BaseUse {
	name: string; // use name
	edition: string; // game edition
}

export interface CreationUse extends BaseUse {
	texture: number; // texture id
}

export interface EntireUseToCreate extends BaseUse {
	paths: CreationPath[]; // all the paths to be created
}

export interface Use extends CreationUse {
	id: string; // use unique id
}

export interface Uses extends Array<Use> {}

export interface UseRepository {
	getUsesByIdAndEdition(id_arr: number[], edition: string): Promise<Uses>;
	getUsesByEdition(edition: string): Promise<Uses>;
	getRaw(): Promise<Uses>;
	getUseByIdOrName(id_or_name: string): Promise<Uses | Use>;
	deleteUse(id: string): Promise<void>;
	set(use: Use): Promise<Use>;
	removeUseById(use_id: string): Promise<void>;
	removeUsesByBulk(use_ids: string[]): Promise<void>;
}

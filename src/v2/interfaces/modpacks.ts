import { ModProviders } from "./mods";

export interface Modpack {
	id: string;
	name: string;
	// empty when an admin created the modpack by hand
	providers?: ModProviders; // platform project ids
	icon?: string;
}

interface ModpackUnresolvedMod {
	platform: keyof ModProviders;
	project_id: string;
	file_id: string;
}

export interface ModpackVersion {
	id: string;
	modpack_id: string;
	version: string;
	minecraft: string[];
	providers?: ModProviders; // platform file ids
	mod_versions: string[];
	unresolved: ModpackUnresolvedMod[]; // mods not imported yet
}

export interface FirestormModpack extends Modpack {}
export interface FirestormModpackVersion extends ModpackVersion {}

export interface ModpacksRepository {
	getRaw(): Promise<Record<string, Modpack>>;
	getById(id: string): Promise<Modpack>;
	getVersions(modpackId: string): Promise<ModpackVersion[]>;
	getVersionById(id: string): Promise<ModpackVersion>;
	getVersionsUsing(modVersionIds: string[]): Promise<ModpackVersion[]>;
}

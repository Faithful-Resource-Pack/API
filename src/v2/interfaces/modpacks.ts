import { Mod } from "./mods";

export interface Modpack {
	id: string; // modpack id (curseforge project id)
	name: string; // modpack name
	authors: string[]; // modpacks authors
	versions: ModpackVersion[];
}

export interface ModpackVersion {
	id: string;
	minecraft: string; // modpack version
	mods: Mod[]; // minecraft version (ex: "1.18")
}

export interface FirestormModpack extends Modpack {}

export interface ModpacksRepository {
	getRaw(): Promise<Record<string, Modpack>>;
	getThumbnail(id: number): Promise<string>;
}

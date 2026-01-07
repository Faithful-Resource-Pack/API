export interface Mod {
	id: string; // mod id (curseforge project id) (custom if not curseforge)
	name: string; // mod name (ex: Industrial Craft 2)
	aliases: string[]; // mod aliases (ex: IC2)
	curse_url: string; // curseforge project url (if not: undefined)
	resource_pack: {
		blacklist: string[]; // mc versions without textures
		versions: string[]; // mc versions supported
		git_repository: string; // github repository link
	};
	blacklisted: boolean; // if true, the mod is fully blacklisted
}

export interface FirestormMod extends Mod {}

export interface ModsRepository {
	getRaw(): Promise<Record<string, Mod>>;
	getThumbnail(id: number): Promise<string>;
	getCurseForgeName(id: number): Promise<string>;
	getNameInDatabase(id: string): Promise<string>;
}

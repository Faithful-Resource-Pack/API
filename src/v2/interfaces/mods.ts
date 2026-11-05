import { MCMETA } from "./textures";

export type ModPlatform = "curseforge" | "modrinth";

export type ModLoader = "forge" | "fabric" | "neoforge" | "quilt" | "liteloader" | "rift";

export type ModProviders = Partial<Record<ModPlatform, string>>;

export interface Mod {
	id: string;
	slug: string; // unique, branch name in every pack repository
	name: string; // mod name (ex: Industrial Craft 2)
	aliases: string[]; // mod aliases (ex: IC2)
	version_validator: string; // regex checked against ModVersion.version on import
	providers?: ModProviders; // platform project ids
	icon?: string;
	blacklisted: boolean; // if true, no contributions on any version (future ones included)
}

export type CreationMod = Omit<Mod, "id"> & { id?: string };

export type ModChannel = "release" | "beta" | "alpha";

type ModVersionStatus = "pending" | "extracting" | "extracted" | "failed";

export interface ModVersion {
	id: string;
	mod_id: string;
	version: string; // matches the mod's version_validator, also the folder name in the mod's branch
	minecraft: string[]; // supported minecraft versions
	loaders: ModLoader[];
	source: ModPlatform[]; // platforms the version was found on, informative only
	// missing on versions imported before channels were stored, those are releases
	channel?: ModChannel;
	status: ModVersionStatus;
	error?: string;
	// non-fatal issues
	warnings?: string[];
	imported_at: number;
	blacklisted: boolean; // if true, no contributions on this version
}

// unique texture asset, identified by the hash of its default png
export interface ModTexture {
	id: string;
	hash: string;
	// hashes of the other textures merged into this one, any of them is an original of this asset
	merged_hashes?: string[];
	// other file names (without extension) of the asset, set when textures with different names are merged
	aliases?: string[];
	// textures an admin reviewed and decided are different, they are not suggested for a merge
	distinct_from?: string[];
	// path in the jar (ex: assets/create/textures/item/rose_quartz.png) to the versions using it there
	paths: Record<string, string[]>;
	mcmeta?: MCMETA;
	width: number;
	height: number;
	animated: boolean;
	vanilla_id?: number; // identical to this vanilla texture: its contributions are used for this asset
	blacklisted?: boolean; // no contribution allowed if true
}

/** A texture shown in a merge suggestion */
export interface ModMergeTexture {
	texture: ModTexture;
	url: string;
	// names of the versions of the mod using it
	versions: string[];
}

/** A texture of a version that has the same path as other textures of the mod's other versions */
export interface ModMergeCandidate {
	path: string;
	texture: ModMergeTexture;
	matches: ModMergeTexture[];
}

export interface ModTextureMergeBody {
	// the first texture is kept, the others are merged into it
	ids: string[];
}

export interface ModTextureDistinctBody {
	// pairs of textures that are different, in both directions
	pairs: { id: string; other: string }[];
}

export interface ModTextureAliasesBody {
	aliases: string[];
}

export interface ModContribution {
	id: string;
	mod_texture_id: string;
	pack: string; // PackID, its github record gives the repository
	pr: number; // merged pull request in that repository
	authors: string[]; // github logins
	date: number; // merge time
}

export type ModSearch = Partial<{
	name: string;
	slug: string;
	blacklisted: boolean;
}>;

export interface ModVersionTexture {
	namespace: string;
	path: string;
	texture: ModTexture & {
		url: string;
	};
}

interface PickableModVersion {
	version: ModVersion;
	// textures of that version the pack has a current contribution for
	contributed: number;
	// blacklisted textures of that version without a contribution, they can't get one
	blacklisted: number;
	// textures of that version
	total: number;
}

/** A mod that can be added to a build, with every extracted version supporting the minecraft version */
export interface PickableMod {
	mod: Mod;
	// newest first
	versions: PickableModVersion[];
}

export interface ModBuildBody {
	pack: string;
	minecraft: string;
	// one version per mod, they all have to support the minecraft version
	mod_version_ids: string[];
}

export type ModContributionSearch = Partial<{
	pack: string;
	texture_id: string;
}>;

export interface FirestormMod extends Mod {}
export interface FirestormModVersion extends ModVersion {}
export interface FirestormModTexture extends ModTexture {}
export interface FirestormModContribution extends ModContribution {}

export type CreationModVersion = Omit<ModVersion, "id">;
export type CreationModContribution = Omit<ModContribution, "id">;
export type CreationModTexture = Omit<ModTexture, "id">;

export interface ImportModBody {
	platform: ModPlatform;
	project_id: string;
	// platform file ids to import, can be empty if mod_id is given to only link the project
	file_ids: string[];
	// attach the platform to an already existing mod instead of creating one
	mod_id?: string;
	// manual versions for files that couldn't be converted to semver (by file id)
	versions?: Record<string, string>;
}

export interface ImportModResult {
	mod: Mod;
	versions: ModVersion[];
}

export interface ModRemoval {
	versions: number;
	contributions: number;
}

export interface ModsRepository {
	getRaw(): Promise<Record<string, Mod>>;
	getById(id: string): Promise<Mod>;
	add(mod: CreationMod): Promise<Mod>;
	update(id: string, mod: Mod): Promise<Mod>;
	addVersion(version: CreationModVersion): Promise<ModVersion>;
	updateVersion(id: string, version: ModVersion): Promise<ModVersion>;
	getAllTextures(): Promise<Record<string, ModTexture>>;
	addTextures(textures: CreationModTexture[]): Promise<ModTexture[]>;
	search(params: ModSearch): Promise<Mod[]>;
	getVersions(modId: string): Promise<ModVersion[]>;
	getAllVersions(): Promise<ModVersion[]>;
	getPackContributions(pack: string): Promise<ModContribution[]>;
	getVersionById(id: string): Promise<ModVersion>;
	getTextureById(id: string): Promise<ModTexture>;
	updateTexture(id: string, texture: ModTexture): Promise<ModTexture>;
	updateTextures(textures: ModTexture[]): Promise<void>;
	updateContributions(contributions: ModContribution[]): Promise<void>;
	getTexturesByVersion(versionId: string): Promise<ModTexture[]>;
	removeTextures(ids: string[]): Promise<void>;
	getContributions(textureIds: string[], params: ModContributionSearch): Promise<ModContribution[]>;
	getContributionById(id: string): Promise<ModContribution>;
	addContributions(contributions: CreationModContribution[]): Promise<ModContribution[]>;
	removeMod(id: string): Promise<void>;
	removeVersions(ids: string[]): Promise<void>;
	removeContributions(ids: string[]): Promise<void>;
}

/** Fields of a mod an admin can change */
export type ModUpdateBody = Partial<
	Pick<Mod, "name" | "aliases" | "version_validator" | "blacklisted" | "icon">
>;

export interface BlacklistBody {
	blacklisted: boolean;
}

/** Sent by the CI of a pack repository once a pull request is merged */
export interface ModMergedBody {
	pack: string; // PackID
	pr: number; // pull request number in the pack's repository
}

export interface ModMergedSkipped {
	path: string;
	reason: string;
}

export interface ModMergedResult {
	contributions: ModContribution[];
	skipped: ModMergedSkipped[];
}

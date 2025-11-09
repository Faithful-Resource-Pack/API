import { WriteConfirmation } from "firestorm-db";
import { EntireUseToCreate, FirestormUse, Uses } from "./uses";
import { FirestormPath, Paths } from "./paths";
import { Contributions, FirestormContribution } from "./contributions";
import { PackID } from "./packs";

export interface TextureCreationParam {
	name: string | number; // texture name
	tags: string[]; // texture tags (block, item...)
}
export interface Texture extends TextureCreationParam {
	id: string; // texture unique id
}
export type Textures = Texture[];

export interface MCMETA {
	animation?: {
		interpolate?: boolean;
		frametime?: number;
		frames?: (number | { index: number; time: number })[];
	};
}

export interface TextureAll extends Texture {
	uses: Uses;
	paths: Paths;
	mcmeta: MCMETA;
	contributions: Contributions;
}

export type TexturesAll = TextureAll[];

export interface EntireTextureToCreate extends TextureCreationParam {
	uses: EntireUseToCreate[];
}

export type Edition = "java" | "bedrock";
export type TextureProperty = null | "uses" | "paths" | "contributions" | "mcmeta" | "all";
export type AnyTextureProperty =
	| Textures
	| Texture
	| Paths
	| Uses
	| Contributions
	| MCMETA
	| TextureAll;

// average typescript experience
export type PropertyToOutput<T extends TextureProperty> = T extends null
	? Texture | Textures
	: T extends "uses"
		? Uses
		: T extends "paths"
			? Paths
			: T extends "contributions"
				? Contributions
				: T extends "mcmeta"
					? MCMETA
					: T extends "all"
						? TextureAll
						: never;

export interface FirestormTexture extends Texture {
	uses(): Promise<FirestormUse[]>;
	paths(textureUses?: FirestormUse[]): Promise<FirestormPath[]>;
	url(pack: PackID, version: string): Promise<string>;
	contributions(): Promise<FirestormContribution[]>;
	mcmeta(texturePaths?: FirestormPath[]): Promise<MCMETA>;
	all(): Promise<TextureAll>;
}

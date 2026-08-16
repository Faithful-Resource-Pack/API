import { WriteConfirmation } from "firestorm-db";
import { EntireUseToCreate, FirestormUse, Use } from "./uses";
import { FirestormPath, Path } from "./paths";
import { Contribution, FirestormContribution } from "./contributions";
import { PackID } from "./packs";

export interface TextureCreationParam {
	name: string; // texture name
	tags: string[]; // texture tags (block, item...)
}
export interface Texture extends TextureCreationParam {
	id: string; // texture unique id
}

export interface MCMETA {
	animation?: {
		interpolate?: boolean;
		frametime?: number;
		frames?: (number | { index: number; time: number })[];
	};
}

export interface TextureAll extends Texture {
	uses: Use[];
	paths: Path[];
	contributions: Contribution[];
	mcmeta: MCMETA;
}

export interface EntireTextureToCreate extends TextureCreationParam {
	uses: EntireUseToCreate[];
}

export interface TextureStats {
	total_textures: number;
	textures_by_edition: Partial<Record<MinecraftEdition, number>>;
	textures_by_tags: Record<string, number>;
}

// this doesn't really fit anywhere else
export type MinecraftEdition = "java" | "bedrock";

// the property in /v2/textures/name_or_id/property and similar endpoints map to these types
export type TextureProperties = {
	uses: Use[];
	paths: Path[];
	contributions: Contribution[];
	mcmeta: MCMETA;
	all: TextureAll;
};

// swagger doesn't support generics so we widen out to a regular union in the controller
export type AnyTextureProperty = TextureProperties[keyof TextureProperties];

export interface FirestormTexture extends Texture {
	uses(): Promise<FirestormUse[]>;
	paths(textureUses?: FirestormUse[]): Promise<FirestormPath[]>;
	url(pack: PackID, version: string): Promise<string>;
	contributions(): Promise<FirestormContribution[]>;
	mcmeta(texturePaths?: FirestormPath[]): Promise<MCMETA>;
	all(): Promise<TextureAll>;
}

export interface TextureRepository {
	getRaw(): Promise<Record<string, Texture>>;
	getById(id: string | number): Promise<FirestormTexture>;
	search(
		nameOrId: string | number | undefined,
		tag?: string,
		forcePartial?: boolean,
	): Promise<Texture | Texture[]>;
	searchProperty<Property extends keyof TextureProperties>(
		nameOrID: string | number,
		property: Property,
		tag?: string,
	): Promise<TextureProperties[Property] | TextureProperties[Property][]>;
	getURLById(id: number, pack: PackID, version: string): Promise<string>;
	getEditions(): Promise<string[]>;
	getResolutions(): Promise<number[]>;
	getAnimated(): Promise<number[]>;
	getTags(): Promise<string[]>;
	createTexture(texture: TextureCreationParam): Promise<Texture>;
	createTexturesBulk(textureArr: EntireTextureToCreate[]): Promise<Texture[]>;
	editTexture(id: string, body: TextureCreationParam): Promise<Texture>;
	deleteTexture(id: string): Promise<WriteConfirmation[]>;
}

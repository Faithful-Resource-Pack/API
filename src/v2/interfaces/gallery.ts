import { Uses } from "./uses";
import { Texture, MCMETA, Edition } from "./textures";
import { Contributions } from "./contributions";
import { PackID } from "./packs";
import { Paths } from "./paths";

export interface GalleryResult {
	name: string;
	pathID: string;
	tags: string[];
	textureID: string;
	mcmeta: MCMETA;
	url: string;
	useID: string;
}

export type AcceptedRes = "16x" | "32x" | "64x";

export type GalleryEdition = Edition | "all";

export interface GalleryModalResult {
	contributions: Contributions;
	texture: Texture;
	uses: Uses;
	paths: Paths;
	mcmeta: MCMETA;
	urls: Record<PackID, string>;
}

import { Use } from "./uses";
import { Edition, MCMETA, Texture } from "./textures";
import { Contribution } from "./contributions";
import { PackID } from "./packs";
import { Path } from "./paths";

export interface GalleryResult {
	textureID: string;
	useID: string;
	pathID: string;
	name: string;
	tags: string[];
	mcmeta: MCMETA; // unused currently
	url: string;
}

export type GalleryEdition = Edition | "all";

export interface GalleryModalResult {
	contributions: Contribution[];
	texture: Texture;
	uses: Use[];
	paths: Path[];
	mcmeta: MCMETA;
	urls: Record<PackID, string>;
}

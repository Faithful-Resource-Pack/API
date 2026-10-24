import { ModTexture } from "../interfaces";

/** Hashes of every original png of a texture: its own and the ones of the textures merged into it */
export const hashesOf = (texture: ModTexture): string[] => [
	texture.hash,
	...(texture.merged_hashes ?? []),
];

/** File name of a jar path without its extension (ex: assets/create/textures/item/gear.png gives gear) */
export const fileName = (jarPath: string): string =>
	(jarPath.split("/").pop() ?? jarPath).replace(/\.png$/i, "");

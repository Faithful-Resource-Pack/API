import { TMinecraftVersion } from '../minecraft';
import { TMinecraftEdition } from '../minecraft';
import { NonEmptyArray } from '..';

export * from './atlas';
export * from './sprite';
export * from './tiled';

export type TTextureType = 'atlas' | 'sprite' | 'tiled';

/**
 * Minecraft Texture
 */
export interface ITexture {
  /** Texture unique id */
  id: string;
  /** Texture name */
  name: string;
  /** Texture aliases */
  aliases?: string[];
  /** Texture type */
  type: TTextureType;
  /** Where the texture is used */
  uses: NonEmptyArray<TTextureUse>;
}

/**
 * Texture usage definition
 */
export type TTextureUse = (
  | { edition: 'java'; type: 'resource_pack'; assets: string }
  | { edition: 'java'; type: 'texture_pack' }
  | { edition: Exclude<TMinecraftEdition, 'java'>; type?: never }
) & { paths: NonEmptyArray<ITexturePath> };

/**
 * Texture path definition
 */
export interface ITexturePath {
  /** Paths that leads to the texture */
  path: string;
  /** Minecraft versions where this path exist */
  versions: NonEmptyArray<TMinecraftVersion>;
  /** File extension */
  extension: 'png' | 'tga';
}

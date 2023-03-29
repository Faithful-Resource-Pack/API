import { TMinecraftVersion } from '../minecraft';
import { TMinecraftEdition } from '../minecraft';
import { NonEmptyArray } from '..';

export * from './atlas';
export * from './sprite';
export * from './tiled';

export type TTextureType = 'atlas' | 'sprite' | 'tile';

/**
 * Minecraft Texture
 */
export interface ITexture {
  /** Texture unique id */
  textureId: string;
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
export interface ITextureUse<T extends TMinecraftEdition> {
  edition: T;
  type: T extends 'java' ? 'resource_pack' | 'texture_pack' : never;
  assets: ITextureUse<T>['type'] extends 'resource_pack' ? string : never;
  paths: NonEmptyArray<ITexturePath>;
}

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

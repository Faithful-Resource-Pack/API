import { TMinecraftVersion, TMinecraftEdition, TMinecraftTextureExtension } from '../minecraft';
import { NonEmptyArray } from '..';
import Mongoose from 'mongoose';

export * from './atlas';
export * from './sprite';
export * from './tiled';

export type TTextureType = 'atlas' | 'sprite' | 'tile';
export type TTextureId = `${TTextureType}:${string}`;

/**
 * Minecraft Texture
 */
export interface ITexture {
  /** Texture unique id */
  textureId: TTextureId;
  /** Texture pack parent */
  texturePack: Mongoose.Types.ObjectId;
  /** Texture name */
  name: string;
  /** Texture aliases */
  aliases?: string[];
  /** Texture type */
  type: TTextureType;
  /** Where the texture is used */
  uses: NonEmptyArray<TTextureUse>;
}

export interface ITextureUseJavaResourcePack {
  edition: 'java';
  type: 'resource_pack';
  assets: string;
}

export interface ITextureUseJavaTexturePack {
  edition: 'java';
  type: 'texture_pack';
}

export interface ITextureUseOtherEditions {
  edition: Exclude<TMinecraftEdition, 'java'>;
}

export interface ITextureUse {
  paths: NonEmptyArray<ITexturePath>;
}

/**
 * Texture usage definition
 */
export type TTextureUse = (ITextureUseJavaResourcePack | ITextureUseJavaTexturePack | ITextureUseOtherEditions) & ITextureUse;

/**
 * Texture path definition
 */
export interface ITexturePath {
  /** Paths that leads to the texture */
  path: string;
  /** Minecraft versions where this path exist */
  versions: NonEmptyArray<TMinecraftVersion>;
  /** File extension */
  extension: TMinecraftTextureExtension;
}

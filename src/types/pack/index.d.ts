import { TMinecraftPackType, TMinecraftVersion, TMinecraftEdition, TMinecraftPackResolution } from '../minecraft';
import { ITexture } from '../texture';

export interface IPack {
  /** Pack unique id */
  id: string;
  /** Pack name */
  name: string;
  /** Pack aliases */
  aliases?: string[];
  /** Pack type */
  type: TMinecraftPackType | unknown;
  /** Pack edition */
  edition: TMinecraftEdition;
  /** Pack resolution : 16, 32, ... */
  resolution: TMinecraftPackResolution;
  /** Pack supported versions */
  versions: NonEmptyArray<TMinecraftVersion>;
  /** Pack textures */
  textures: NonEmptyArray<ITexture['id']>;
  /** Pack description */
  description?: string;
  /** Git url */
  git: string;
  /** Socials */
  socials?: {
    /** Twitter */
    twitter?: string;
    /** Discord */
    discord?: string;
    /** Github */
    github?: string;
    /** Other socials */
    [key: string]: string | undefined;
  };
}

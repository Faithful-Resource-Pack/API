import { TMinecraftVersion } from '../minecraft';
import { ITexture } from '.';
import { NonEmptyArray } from '..';

export interface ITextureAtlas extends ITexture {
  type: 'atlas';

  /** Atlas texture size in columns and rows */
  size: ITextureAtlasSize;

  /** Textures mapping within the atlas */
  map: ITextureAtlasMap;
}

/**
 * Texture atlas map of contained textures
 */
export interface ITextureAtlasMap {
  [id: string]: {
    pos: ITextureAtlasTexturePosition;
    versions: NonEmptyArray<TMinecraftVersion> | 'all';
  };
}

/**
 * Texture position within the Atlas
 */
export interface ITextureAtlasTexturePosition {
  /** Columns, start/end positions or a unique value */
  cols:
    | {
        /** Start column (start at 0) */
        s: number;
        /** End column (start at 0) */
        e: number;
      }
    | number;

  /** Rows, start/end positions or a unique value */
  rows:
    | {
        /** Start column (start at 0) */
        s: number;
        /** End column (start at 0) */
        e: number;
      }
    | number;
}

/**
 * Atlas texture size in columns and rows
 */
export interface ITextureAtlasSize {
  /** Number of columns */
  cols: number;
  /** Number of rows */
  rows: number;
}

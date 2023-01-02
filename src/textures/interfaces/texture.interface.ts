export interface Tags {
  name: string;
}

export type TFileExtension = 'png' | 'tga';
export type TTextureName = string;
export type TMinecraftVersion = string;
export type TMinecraftEdition = 'java' | 'bedrock' | 'dungeons';
export type TTextureType = 'atlas' | 'sprite' | 'tiled';
export type TPackVariant = 'texture_pack' | 'resource_pack';

export interface ITexturePath {
  /** Paths that leads to the texture */
  path: string;
  /** Minecraft versions where this path exist */
  versions?: TMinecraftVersion[];
  /** File extension */
  extension: TFileExtension;
}

export interface ITextureUse<
  T extends TPackVariant,
  E extends TMinecraftEdition,
> {
  /** Minecraft game edition (java, bedrock, ...) */
  edition: E;
  /** Type of pack (texture_pack or resource_pack), useless for non-java edition games */
  type: T;
  /** Assets folder name for java edition files */
  assets: string;

  // TODO: at least one of (atlas, paths) should be present in the object
  /** Atlas where you can find this texture inside */
  atlas?: {
    /** The corresponding atlas texture id */
    id: TTextureName;
    /** Minecraft versions for which this texture is used in the atlas */
    versions: TMinecraftVersion[];
  }[];
  /** Paths were you can find the texture for the given edition AND/OR versions */
  paths?: ITexturePath[];
}

export type TPosition =
  | {
      /** Width start point (pixels) */
      x0: number;
      /** Width end point (pixels) */
      x1: number;
      /** Height start point (pixels) */
      y0: number;
      /** Height end point (pixels) */
      y1: number;
    }
  | {
      /** Column (starts at 0) */
      c: number;
      /** Row (starts at 0)*/
      r: number;
    }
  | {
      /** Start Column (starts at 0) */
      c0: number;
      /** End Column (starts at 0) */
      c1: number;
      /** Start Row (starts at 0)*/
      r0: number;
      /** End Row (starts at 0)*/
      r1: number;
    };

export interface ITextureConfiguration {
  /** Textures uses */
  uses?: // TODO: 'type' doesn't seems to be omitted when 'edition' === 'bedrock'
  (
    | Omit<ITextureUse<never, 'bedrock'>, 'assets' | 'type'>
    | ITextureUse<'resource_pack', 'java'>
    | Omit<ITextureUse<'texture_pack', 'java'>, 'assets'>
  )[];

  /**
   * Texture atlas dimensions
   * - Use pixels (x,y) for uneven rows/columns (icons.png)
   * - Use columns & rows (c,r) for grids (terrain.png)
   * */
  size?:
    | {
        /** width in pixels */
        x: number;
        /** height in pixels */
        y: number;
      }
    | {
        /** number of columns */
        c: number;
        /** number of rows */
        r: number;
      };

  /**
   * Texture atlas map of contained textures
   */
  map?: {
    [id: string]: {
      /** Texture position within the Atlas */
      pos: TPosition;
      /** For which version of the atlas the texture is set to this position */
      versions: TMinecraftVersion[] | 'all';
    };
  };

  /** Is the texture colored by the game? */
  tint?: boolean;

  /** Null if the texture is not animated, the mcmeta object otherwise */
  mcmeta?: null | object;
}

export interface ITexture {
  /** Unique texture name identifier */
  id: TTextureName;
  /** Aliases for that texture */
  alias: TTextureName[] | null;
  /** What kind of texture it is */
  type: TTextureType;
  /** Short description */
  description?: string;
  /** Texture tags */
  tags: Tags[];
  /** In which pack this texture is used */
  packs: string[];
  /** Texture configuration, depends on the texture type */
  configuration: ITexture['type'] extends 'atlas'
    ? Required<Pick<ITextureConfiguration, 'size' | 'map' | 'uses'>>
    : ITexture['type'] extends 'sprite'
    ? Required<Pick<ITextureConfiguration, 'tint' | 'mcmeta' | 'uses'>>
    : never;
}

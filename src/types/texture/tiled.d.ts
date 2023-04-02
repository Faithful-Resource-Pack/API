import { ITextureSprite } from '.';

export interface ITextureTile extends ITextureSprite {
  type: 'tile';

  /** MCMETA object */
  mcmeta: MCMETA;
}

/**
 * MCMETA object for animated textures
 */
export interface IAnimationMCMETA {
  animation: {
    interpolate?: boolean;
    width: number;
    height: number;
    frametime?: number;
    frames: Array<{ index: number; time: number } | number>;
  };
}

/**
 * MCMETA object for villagers textures
 */
export interface IVillagersMCMETA {
  villager: {
    hat: 'full' | 'partial';
  };
}

/**
 * MCMETA object for textures properties
 */
export interface IPropertiesMCMETA {
  texture: {
    blur?: boolean;
    clamp?: boolean;
    mipmaps: Array<number>;
  };
}

export type MCMETA = IAnimationMCMETA | IVillagersMCMETA | IPropertiesMCMETA;

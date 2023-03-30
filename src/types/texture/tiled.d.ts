import { ITextureSprite } from '.';

export interface ITextureTile extends ITextureSprite {
  type: 'tile';

  /** MCMETA object */
  mcmeta: MCMETA;
}

export type MCMETA =
  | {
      animation: {
        interpolate?: boolean;
        width: number;
        height: number;
        frametime?: number;
        frames: Array<{ index: number; time: number } | number>;
      };
    }
  | { villager: { hat: 'full' | 'partial' } }
  | {
      texture: {
        blur?: boolean;
        clamp?: boolean;
        mipmaps: Array<number>;
      };
    };

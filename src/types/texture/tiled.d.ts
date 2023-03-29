import { ITexture } from '.';

export interface ITextureTile extends ITexture {
  type: 'tiled';
  tinted: boolean;
  mcmeta: object;
}

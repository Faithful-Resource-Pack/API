import { ITexture } from '.';

export interface ITextureTiled extends ITexture {
  type: 'tiled';
  tinted: boolean;
  mcmeta: object;
}

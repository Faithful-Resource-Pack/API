import { ITexture } from '.';

export interface ITextureSprite extends ITexture {
  type: 'sprite';

  /** Either the texture is colorized by the game */
  tinted: boolean;
}

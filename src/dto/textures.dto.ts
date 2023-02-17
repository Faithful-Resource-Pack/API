import { TTextureType, NonEmptyArray, TTextureUse, ITextureAtlasMap, ITextureAtlasSize } from 'src/types';

export class CreateTextureDto {
  id: string;
  name: string;
  aliases?: string[];
  type: TTextureType;
  uses: NonEmptyArray<TTextureUse>;
}

export class CreateAtlasTextureDto extends CreateTextureDto {
  type: 'atlas';
  size: ITextureAtlasSize;
  map: ITextureAtlasMap;
}

export class CreateSpriteTextureDto extends CreateTextureDto {
  type: 'sprite';
  tinted: boolean;
}

export class CreateTiledTextureDto extends CreateTextureDto {
  type: 'tiled';
  tinted: boolean;
  mcmeta: object;
}

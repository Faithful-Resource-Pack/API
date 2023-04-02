import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TextureAtlas, TextureAtlasDocument } from 'src/core/schemas/textures/texture/atlas.schema';
import { TextureSprite, TextureSpriteDocument } from 'src/core/schemas/textures/texture/sprite.schema';
import { TextureTile, TextureTileDocument } from 'src/core/schemas/textures/texture/tile.schema';

@Injectable()
export class TexturesService {
  constructor(
    @InjectModel(TextureAtlas.name) private readonly textureAtlasModel: Model<TextureAtlasDocument>,
    @InjectModel(TextureSprite.name) private readonly textureSpriteModel: Model<TextureSpriteDocument>,
    @InjectModel(TextureTile.name) private readonly textureTileModel: Model<TextureTileDocument>,
  ) {}

  async getTextures(): Promise<Array<TextureAtlas | TextureSprite | TextureTile>> {
    const atlas = await this.textureAtlasModel.find({ type: 'atlas' });
    const sprite = await this.textureSpriteModel.find({ type: 'sprite' });
    const tile = await this.textureTileModel.find({ type: 'tile' });

    return [...atlas, ...sprite, ...tile];
  }
}

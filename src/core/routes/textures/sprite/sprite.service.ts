import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateTextureSpriteDto } from 'src/core/dto/textures/sprite.dto';
import { TextureSprite, TextureSpriteDocument } from 'src/core/schemas/textures/textures.schema';

@Injectable()
export class TexturesSpriteService {
  constructor(@InjectModel(TextureSprite.name) private readonly textureSpriteModel: Model<TextureSpriteDocument>) {}

  async create(createSpriteDto: CreateTextureSpriteDto): Promise<TextureSprite> {
    const createdSprite = new this.textureSpriteModel(createSpriteDto);
    return createdSprite.save();
  }
}

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateTextureTileDto } from 'src/core/dto/textures/tile.dto';
import { TextureTile, TextureTileDocument } from 'src/core/schemas/textures/texture/tile.schema';

@Injectable()
export class TexturesTilesService {
  constructor(@InjectModel(TextureTile.name) private readonly TextureTileModel: Model<TextureTileDocument>) {}

  async create(createTileDto: CreateTextureTileDto): Promise<TextureTile> {
    const createdSprite = new this.TextureTileModel(createTileDto);
    return createdSprite.save();
  }
}

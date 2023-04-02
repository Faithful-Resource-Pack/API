import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateTextureAtlasDto } from 'src/core/dto/textures/atlas.dto';
import { TextureAtlas, TextureAtlasDocument } from 'src/core/schemas/textures/texture/atlas.schema';

@Injectable()
export class TexturesAtlasService {
  constructor(@InjectModel(TextureAtlas.name) private readonly textureAtlasModel: Model<TextureAtlasDocument>) {}

  async create(createAtlasDto: CreateTextureAtlasDto): Promise<TextureAtlas> {
    const createdAtlas = new this.textureAtlasModel(createAtlasDto);
    return createdAtlas.save();
  }
}

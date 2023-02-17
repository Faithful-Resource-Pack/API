import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateAtlasTextureDto, CreateSpriteTextureDto, CreateTiledTextureDto } from 'src/core/dto/textures.dto';
import { Texture, TextureDocument } from 'src/core/schemas/texture.schema';

@Injectable()
export class TexturesService {
  constructor(
    @InjectModel(Texture.name)
    private textureModel: Model<TextureDocument>,
  ) {}

  async createAtlas(createAtlasDto: CreateAtlasTextureDto): Promise<Texture> {
    return new this.textureModel(createAtlasDto).save();
  }

  async createSprite(createSpriteDto: CreateSpriteTextureDto): Promise<Texture> {
    return new this.textureModel(createSpriteDto).save();
  }

  async createTiled(createTileDto: CreateTiledTextureDto): Promise<Texture> {
    return new this.textureModel(createTileDto, null, true).save();
  }

  async findAll(): Promise<Texture[]> {
    return await this.textureModel.find().exec();
  }

  async findOne(id: string): Promise<Texture> {
    return this.textureModel.findById(id).exec();
  }

  async delete(id: string): Promise<Texture> {
    return this.textureModel.findByIdAndDelete(id).exec();
  }
}

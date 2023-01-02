import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Texture, TextureDocument } from 'src/schemas/texture.schema';
import { CreateTextureDto } from './dto/create-texture.dto';
import { UpdateTextureDto } from './dto/update-texture.dto';

@Injectable()
export class TexturesService {
  constructor(
    @InjectModel(Texture.name)
    private textureModel: Model<TextureDocument>,
  ) {}

  async findAll(): Promise<Texture[]> {
    return this.textureModel.find().exec();
  }

  async findOne(id: string): Promise<Texture> {
    return this.textureModel.findById(id).exec();
  }

  async create(CreateTextureDto: CreateTextureDto): Promise<Texture> {
    return new this.textureModel({
      ...CreateTextureDto,
      createdAt: new Date(),
    }).save();
  }

  async update(
    id: string,
    updateTextureDto: UpdateTextureDto,
  ): Promise<Texture> {
    return this.textureModel.findByIdAndUpdate(id, updateTextureDto).exec();
  }

  async delete(id: string): Promise<Texture> {
    return this.textureModel.findByIdAndDelete(id).exec();
  }
}

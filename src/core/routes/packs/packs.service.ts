import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreatePackDto } from 'src/core/dto/packs.dto';
import { Pack, PackDocument } from 'src/core/schemas/packs.schema';

@Injectable()
export class PacksService {
  constructor(
    @InjectModel(Pack.name)
    private packModel: Model<PackDocument>,
  ) {}

  async exist(id: string): Promise<boolean> {
    return this.findOne(id).then((res) => res !== null);
  }

  async create(createPackDto: CreatePackDto): Promise<Pack> {
    return new this.packModel(createPackDto).save();
  }

  async findAll(): Promise<Pack[]> {
    return await this.packModel.find().exec();
  }

  async findOne(id: string): Promise<Pack> {
    return this.packModel.findById(id, { textures: true }).exec();
  }

  async update(id: string, updatePackDto: CreatePackDto): Promise<Pack> {
    return this.packModel.findByIdAndUpdate(id, updatePackDto).exec();
  }

  async delete(id: string): Promise<Pack> {
    return this.packModel.findByIdAndDelete(id).exec();
  }
}

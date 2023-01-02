import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { TexturesService } from './textures.service';
import { Texture } from 'src/schemas/texture.schema';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateTextureDto } from './dto/create-texture.dto';
import { UpdateTextureDto } from './dto/update-texture.dto';

@ApiBearerAuth()
@ApiTags('Textures')
@Controller({ path: 'textures' })
export class TexturesController {
  constructor(private readonly textureService: TexturesService) {}

  @Get()
  async findAll(): Promise<Texture[]> {
    return this.textureService.findAll();
  }

  @Get(':id')
  async find(@Param('id') id: string): Promise<Texture> {
    return this.textureService.findOne(id);
  }

  @Post()
  async create(@Body() createTextureDto: CreateTextureDto): Promise<Texture> {
    return this.textureService.create(createTextureDto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTextureDto: UpdateTextureDto,
  ): Promise<Texture> {
    return this.textureService.update(id, updateTextureDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<Texture> {
    return this.textureService.delete(id);
  }
}

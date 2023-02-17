import { Body, Controller, Delete, Get, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TexturesService } from './textures.service';
import { Texture } from 'src/schemas/texture.schema';
import { HTTPException } from 'src/types';
import { CreateAtlasTextureDto, CreateSpriteTextureDto, CreateTiledTextureDto } from 'src/dto/textures.dto';

@ApiTags('Textures')
@Controller({ path: 'textures' })
export class TexturesController {
  constructor(private readonly texturesService: TexturesService) {}

  @Get()
  async findAll(): Promise<Texture[]> {
    return this.texturesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Texture | HTTPException> {
    return this.texturesService.findOne(id).catch((err) => ({ message: err.message, status: HttpStatus.BAD_REQUEST }));
  }

  @Post('atlas')
  async createAtlas(@Body() createAtlasDto: CreateAtlasTextureDto): Promise<Texture | HTTPException> {
    return this.texturesService
      .createAtlas(createAtlasDto)
      .catch((err) => ({ message: err.message, status: HttpStatus.BAD_REQUEST }));
  }

  @Post('sprite')
  async createSprite(@Body() createSpriteDto: CreateSpriteTextureDto): Promise<Texture | HTTPException> {
    return this.texturesService
      .createSprite(createSpriteDto)
      .catch((err) => ({ message: err.message, status: HttpStatus.BAD_REQUEST }));
  }

  @Post('tile')
  async createTile(@Body() createTileDto: CreateTiledTextureDto): Promise<Texture | HTTPException> {
    return this.texturesService
      .createTiled(createTileDto)
      .catch((err) => ({ message: err.message, status: HttpStatus.BAD_REQUEST }));
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<Texture | HTTPException> {
    return this.texturesService.delete(id).catch((err) => ({ message: err.message, status: HttpStatus.BAD_REQUEST }));
  }
}

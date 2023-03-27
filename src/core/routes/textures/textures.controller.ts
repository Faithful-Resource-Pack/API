import { Body, Controller, Delete, Get, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TexturesService } from './textures.service';
import { Texture } from 'src/core/schemas/texture.schema';
import { CreateAtlasTextureDto, CreateSpriteTextureDto, CreateTiledTextureDto } from 'src/core/dto/textures.dto';
import { Roles, ROLES } from 'src/core/decorators/roles.decorator';

import type { HTTPException } from 'src/types';
import { Public } from 'src/core/decorators/public.decorator';

@ApiTags('Textures')
@Controller({ path: 'textures' })
export class TexturesController {
  constructor(private readonly texturesService: TexturesService) {}

  @Get()
  @Public()
  async findAll(): Promise<Texture[]> {
    return this.texturesService.findAll();
  }

  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string): Promise<Texture | HTTPException> {
    return this.texturesService.findOne(id).catch((err) => ({ message: err.message, status: HttpStatus.BAD_REQUEST }));
  }

  @Post('atlas')
  @ApiBearerAuth()
  @Roles(ROLES.ADMIN)
  async createAtlas(@Body() createAtlasDto: CreateAtlasTextureDto): Promise<Texture | HTTPException> {
    return this.texturesService
      .createAtlas(createAtlasDto)
      .catch((err) => ({ message: err.message, status: HttpStatus.BAD_REQUEST }));
  }

  @Post('sprite')
  @ApiBearerAuth()
  @Roles(ROLES.ADMIN)
  async createSprite(@Body() createSpriteDto: CreateSpriteTextureDto): Promise<Texture | HTTPException> {
    return this.texturesService
      .createSprite(createSpriteDto)
      .catch((err) => ({ message: err.message, status: HttpStatus.BAD_REQUEST }));
  }

  @Post('tile')
  @ApiBearerAuth()
  @Roles(ROLES.ADMIN)
  async createTile(@Body() createTileDto: CreateTiledTextureDto): Promise<Texture | HTTPException> {
    return this.texturesService
      .createTiled(createTileDto)
      .catch((err) => ({ message: err.message, status: HttpStatus.BAD_REQUEST }));
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(ROLES.ADMIN)
  async delete(@Param('id') id: string): Promise<Texture | HTTPException> {
    return this.texturesService.delete(id).catch((err) => ({ message: err.message, status: HttpStatus.BAD_REQUEST }));
  }
}

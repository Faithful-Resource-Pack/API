import { Body, Controller, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles, ROLES } from 'src/core/decorators/roles.decorator';
import { CreateTextureAtlasDto } from 'src/core/dto/textures/atlas.dto';
import { TextureAtlas } from 'src/core/schemas/textures/texture/atlas.schema';
import { HTTPException } from 'src/types';
import { TexturesAtlasService } from './atlas.service';

@ApiTags('Textures', 'Atlas')
@Controller({ path: 'textures/atlas' })
export class TexturesAtlasController {
  constructor(private readonly textureService: TexturesAtlasService) {}

  @Post()
  @ApiBearerAuth()
  @Roles(ROLES.ADMIN)
  async create(@Body() createAtlasDto: CreateTextureAtlasDto): Promise<TextureAtlas | HTTPException> {
    return this.textureService
      .create(createAtlasDto)
      .catch((err) => ({ message: err.message, status: HttpStatus.BAD_REQUEST }));
  }
}

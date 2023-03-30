import { Body, Controller, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles, ROLES } from 'src/core/decorators/roles.decorator';
import { CreateTextureSpriteDto } from 'src/core/dto/textures/sprite.dto';
import { TextureSprite } from 'src/core/schemas/textures/textures.schema';
import { HTTPException } from 'src/types';
import { TexturesSpriteService } from './sprite.service';

@ApiTags('Textures', 'Sprites')
@Controller({ path: 'textures/sprites' })
export class TexturesSpritesController {
  constructor(private readonly textureService: TexturesSpriteService) {}

  @Post()
  @ApiBearerAuth()
  @Roles(ROLES.ADMIN)
  async create(@Body() createSpriteDto: CreateTextureSpriteDto): Promise<TextureSprite | HTTPException> {
    return this.textureService
      .create(createSpriteDto)
      .catch((err) => ({ message: err.message, status: HttpStatus.BAD_REQUEST }));
  }
}

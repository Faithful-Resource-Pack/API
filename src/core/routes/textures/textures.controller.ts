import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from 'src/core/decorators/public.decorator';
import { TextureAtlas } from 'src/core/schemas/textures/texture/atlas.schema';
import { TextureSprite } from 'src/core/schemas/textures/texture/sprite.schema';
import { TextureTile } from 'src/core/schemas/textures/texture/tile.schema';
import { HTTPException } from 'src/types';
import { TexturesService } from './textures.service';

@ApiTags('Textures')
@Controller({ path: 'textures' })
export class TexturesController {
  constructor(private readonly textureService: TexturesService) {}

  @Get()
  @Public()
  async getTextures(): Promise<Array<TextureAtlas | TextureSprite | TextureTile> | HTTPException> {
    return this.textureService.getTextures().catch((err) => ({ message: err.message, status: HttpStatus.BAD_REQUEST }));
  }
}

import { Body, Controller, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles, ROLES } from 'src/core/decorators/roles.decorator';
import { CreateTextureTileDto } from 'src/core/dto/textures/tile.dto';
import { TextureTile } from 'src/core/schemas/textures/texture/tile.schema';
import { HTTPException } from 'src/types';
import { TexturesTilesService } from './tile.service';

@ApiTags('Textures', 'Tiles')
@Controller({ path: 'textures/tiles' })
export class TexturesTilesController {
  constructor(private readonly textureService: TexturesTilesService) {}

  @Post()
  @ApiBearerAuth()
  @Roles(ROLES.ADMIN)
  async create(@Body() createTileDto: CreateTextureTileDto): Promise<TextureTile | HTTPException> {
    return this.textureService.create(createTileDto).catch((err) => ({ message: err.message, status: HttpStatus.BAD_REQUEST }));
  }
}

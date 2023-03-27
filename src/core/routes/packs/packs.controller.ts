import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Put } from '@nestjs/common';
import { PacksService } from './packs.service';
import { Pack } from 'src/core/schemas/packs.schema';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreatePackDto, UpdatePackDto } from 'src/core/dto/packs.dto';
import { HTTPException } from '../../../types';
import { Roles, ROLES } from 'src/core/decorators/roles.decorator';
import { Public } from 'src/core/decorators/public.decorator';

@ApiTags('Resource Packs')
@Controller({ path: 'packs' })
export class PacksController {
  constructor(private readonly packService: PacksService) {}

  @Get()
  @Public()
  async findAll(): Promise<Array<Omit<Pack, 'textures'>>> {
    return this.packService.findAll();
  }

  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string): Promise<Pack | HTTPException> {
    let res: Pack = null;

    try {
      res = await this.packService.findOne(id);
    } catch (err: any) {
      return { message: err.message, status: HttpStatus.BAD_REQUEST };
    }

    return res !== null ? res : { message: `Pack with id '${id}' not found`, status: HttpStatus.NOT_FOUND };
  }

  @Get(':id/textures')
  @Public()
  async findTextures(@Param('id') id: string): Promise<Array<string> | HTTPException> {
    return this.packService
      .findOne(id)
      .then((res) => res.textures)
      .catch((err) => ({ message: err.message, status: HttpStatus.BAD_REQUEST }));
  }

  @Post()
  @ApiBearerAuth()
  @Roles(ROLES.ADMIN)
  async create(@Body() createPackDto: CreatePackDto): Promise<Pack | HTTPException> {
    return this.packService.create(createPackDto).catch((err) => ({ message: err.message, status: HttpStatus.BAD_REQUEST }));
  }

  @Put(':id')
  @ApiBearerAuth()
  @Roles(ROLES.ADMIN)
  async update(@Param('id') id: string, @Body() updatePackDto: UpdatePackDto): Promise<Pack | HTTPException> {
    return this.packService
      .update(id, updatePackDto)
      .catch((err) => ({ message: err.message, status: HttpStatus.BAD_REQUEST }));
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(ROLES.ADMIN)
  async delete(@Param('id') id: string): Promise<Pack | HTTPException> {
    return this.packService.delete(id).catch((err) => ({ message: err.message, status: HttpStatus.BAD_REQUEST }));
  }
}

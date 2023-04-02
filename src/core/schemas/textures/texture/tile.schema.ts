import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ITextureTile, MCMETA } from 'src/types';
import { ApiProperty } from '@nestjs/swagger';
import { AnimationMCMETASchema } from '../mcmeta/animation.schema';
import { VillagerMCMETASchema } from '../mcmeta/villager.schema';
import { PropertiesMCMETASchema } from '../mcmeta/properties.schema';
import { Texture } from './base.schema';

@Schema()
export class TextureTile extends Texture implements ITextureTile {
  @ApiProperty({ example: 'tile:stone', required: true, type: String })
  textureId: `tile:${string}`;

  @Prop({ required: true, type: [AnimationMCMETASchema, VillagerMCMETASchema, PropertiesMCMETASchema] })
  @ApiProperty({
    example: { animation: { interpolate: false, width: 16, height: 32, frametime: 1, frames: [0, 1] } },
    required: true,
    type: [AnimationMCMETASchema, VillagerMCMETASchema, PropertiesMCMETASchema],
  })
  mcmeta: MCMETA;

  @Prop({ required: true, type: Boolean })
  @ApiProperty({ example: false, required: true, type: Boolean })
  tinted: boolean;

  @Prop({ required: true, enum: ['tile'] })
  @ApiProperty({ example: 'tile', required: true, enum: ['tile'] })
  type: 'tile';
}

export const TextureTileSchema = SchemaFactory.createForClass(TextureTile);
export type TextureTileDocument = TextureTile & Document;

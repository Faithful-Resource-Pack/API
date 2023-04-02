import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { ITextureSprite } from 'src/types';
import { Texture } from './base.schema';

@Schema()
export class TextureSprite extends Texture implements ITextureSprite {
  @ApiProperty({ example: 'sprite:stone', required: true, type: String })
  textureId: `sprite:${string}`;

  @Prop({ required: false, type: Boolean, default: false })
  @ApiProperty({ example: false, required: false, type: Boolean })
  tinted: boolean;

  @Prop({ required: true, enum: ['sprite'] })
  @ApiProperty({ example: 'sprite', required: true, enum: ['sprite'] })
  type: 'sprite';
}

export const TextureSpriteSchema = SchemaFactory.createForClass(TextureSprite);
export type TextureSpriteDocument = TextureSprite & Document;

import { ApiProperty } from '@nestjs/swagger';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ITexture, NonEmptyArray, TTextureId, TTextureType, TTextureUse } from 'src/types';
import {
  TextureUseJavaResourcePackSchema,
  TextureUseJavaTexturePackSchema,
  TextureUseOtherEditionsSchema,
} from '../uses.schema';

import mongoose from 'mongoose';

@Schema()
export class Texture implements ITexture {
  @Prop({ required: true, type: String, unique: true })
  textureId: TTextureId;

  @Prop({ required: true, type: mongoose.Types.ObjectId, unique: true })
  @ApiProperty({ example: '5f9f1c9c0b9b8c0b8c0b8c0b', required: true, type: String })
  texturePack: mongoose.Types.ObjectId;

  @Prop({ required: true, type: String })
  @ApiProperty({ example: 'stone', required: true, type: String })
  name: string;

  @Prop({ required: false, type: [String] })
  @ApiProperty({ example: ['stone', 'infested_stone'], required: false, type: [String] })
  aliases?: string[];

  @Prop({ required: true, enum: ['atlas', 'sprite', 'tile'] })
  @ApiProperty({ example: 'sprite', required: true, enum: ['atlas', 'sprite', 'tile'] })
  type: TTextureType;

  @Prop({
    required: true,
    type: [TextureUseJavaResourcePackSchema, TextureUseJavaTexturePackSchema, TextureUseOtherEditionsSchema],
    validate: [(v: NonEmptyArray<TTextureUse>) => v.length > 0, '{PATH} must have at least one use'],
  })
  @ApiProperty({
    example: [
      {
        edition: 'java',
        type: 'resource_pack',
        assets: 'minecraft',
        paths: [
          {
            versions: ['1.16.5'],
            path: 'textures/block/stone',
            extension: 'png',
          },
          {
            versions: ['1.16.5'],
            path: 'textures/gui/advancements/backgrounds/stone',
            extension: 'png',
          },
        ],
      },
    ],
    required: true,
    type: [TextureUseJavaResourcePackSchema, TextureUseJavaTexturePackSchema, TextureUseOtherEditionsSchema],
  })
  uses: NonEmptyArray<TTextureUse>;
}

export const TextureSchema = SchemaFactory.createForClass(Texture);
export type TextureDocument = Texture & Document;

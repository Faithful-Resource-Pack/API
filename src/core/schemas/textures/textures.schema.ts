import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ITexture, ITextureSprite, ITextureTile, MCMETA, NonEmptyArray, TTextureType, TTextureUse } from 'src/types';
import {
  TextureUseJavaResourcePackSchema,
  TextureUseJavaTexturePackSchema,
  TextureUseOtherEditionsSchema,
} from './uses.schema';
import { ApiProperty } from '@nestjs/swagger';

@Schema()
export class Texture implements ITexture {
  @Prop({ required: true, type: String, unique: true })
  @ApiProperty({ example: 'sprite:stone', required: true, type: String })
  textureId: string;

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

@Schema()
export class TextureSprite extends Texture implements ITextureSprite {
  @Prop({ required: false, type: Boolean, default: false })
  @ApiProperty({ example: false, required: false, type: Boolean })
  tinted: boolean;

  @Prop({ required: true, enum: ['sprite'] })
  @ApiProperty({ example: 'sprite', required: true, enum: ['sprite'] })
  type: 'sprite';
}

@Schema()
export class TextureTile extends Texture implements ITextureTile {
  // TODO: Add mcmeta validation
  @Prop({ required: true, type: Object })
  mcmeta: MCMETA;

  @Prop({ required: true, type: Boolean })
  @ApiProperty({ example: false, required: true, type: Boolean })
  tinted: boolean;

  @Prop({ required: true, enum: ['tile'] })
  @ApiProperty({ example: 'tile', required: true, enum: ['tile'] })
  type: 'tile';
}

export const TextureSchema = SchemaFactory.createForClass(Texture);
export const TextureSpriteSchema = SchemaFactory.createForClass(TextureSprite);
export const TextureTileSchema = SchemaFactory.createForClass(TextureTile);

export type TextureDocument = Texture & Document;
export type TextureSpriteDocument = TextureSprite & Document;
export type TextureTileDocument = TextureTile & Document;

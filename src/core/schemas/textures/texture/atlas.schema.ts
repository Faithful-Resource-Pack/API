import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { ITextureAtlas, ITextureAtlasSize, ITextureAtlasTexture, TTextureId } from 'src/types';
import { Texture } from './base.schema';

@Schema({ _id: false })
class TextureAtlasSize implements ITextureAtlasSize {
  @Prop({ required: true, min: 1, type: Number, default: 1 })
  @ApiProperty({ required: true, minimum: 1, default: 1, type: Number })
  cols: number;

  @Prop({ required: true, min: 1, type: Number, default: 1 })
  @ApiProperty({ required: true, minimum: 1, default: 1, type: Number })
  rows: number;
}

const TextureAtlasSizeSchema = SchemaFactory.createForClass(TextureAtlasSize);

@Schema()
export class TextureAtlas extends Texture implements ITextureAtlas {
  @ApiProperty({ example: 'atlas:main', required: true, type: String })
  textureId: `atlas:${string}`;

  @Prop({ required: true, type: String, enum: ['atlas'] })
  @ApiProperty({ required: true, type: String, example: 'atlas' })
  type: 'atlas';

  @Prop({ required: true, type: TextureAtlasSizeSchema })
  @ApiProperty({ required: true, type: TextureAtlasSizeSchema, example: { cols: 1, rows: 1 } })
  size: ITextureAtlasSize;

  @Prop({ required: true, type: Map<`sprite:${string}`, ITextureAtlasTexture> })
  @ApiProperty({
    required: true,
    type: Map<`sprite:${string}`, ITextureAtlasTexture>,
    example: {
      'sprite:stone': { pos: { cols: 0, rows: 0 }, versions: 'all' },
      'sprite:grass': { pos: { cols: 0, rows: 0 }, versions: ['1.7'] },
    },
  })
  map: Map<`sprite:${string}`, ITextureAtlasTexture>;
}

export const TextureAtlasSchema = SchemaFactory.createForClass(TextureAtlas);
export type TextureAtlasDocument = TextureAtlas & Document;

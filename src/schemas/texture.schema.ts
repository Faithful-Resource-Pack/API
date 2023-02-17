import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  ITexture,
  NonEmptyArray,
  TMinecraftVersion,
  ITextureAtlas,
  ITextureSprite,
  ITextureTiled,
  ITextureAtlasMap,
  ITextureAtlasSize,
  TTextureUse,
} from 'src/types';

export type TextureDocument = Texture & Document;

@Schema()
export class Texture implements ITexture, ITextureAtlas, ITextureSprite, ITextureTiled {
  @Prop({ required: true, type: String, enum: ['atlas', 'sprite', 'tiled'] })
  type!: any;

  @Prop({ required: true, type: Array })
  uses: NonEmptyArray<TTextureUse>;

  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: false })
  aliases?: string[];

  @Prop({ required: true, type: Array })
  versions: NonEmptyArray<TMinecraftVersion>;

  @Prop({
    required: function (this: Texture) {
      return this.type === 'atlas';
    },
    type: Object,
  })
  size: ITextureAtlasSize;

  @Prop({
    required: function (this: Texture) {
      return this.type === 'atlas';
    },
    type: Object,
  })
  map: ITextureAtlasMap;

  @Prop({
    required: function (this: Texture) {
      return this.type === 'sprite' || this.type === 'tiled';
    },
  })
  tinted: boolean;

  @Prop({
    required: function (this: Texture) {
      return this.type === 'tiled';
    },
    type: Object,
  })
  mcmeta: object;
}

export const TextureSchema = SchemaFactory.createForClass(Texture);

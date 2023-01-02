import mongoose, { HydratedDocument } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Tag } from './tag.schema';
import {
  ITexture,
  ITextureConfiguration,
  TTextureType,
} from 'src/textures/interfaces/texture.interface';

export type TextureDocument = HydratedDocument<Texture>;

@Schema({ collection: 'textures' })
export class Texture implements ITexture {
  /** Texture name */
  @Prop({ required: true })
  id: string;

  /** Aliases for that texture */
  @Prop({ default: () => null })
  alias: string[] | null;

  /** What kind of texture it is */
  @Prop({ required: true, default: () => 'sprite' })
  type: TTextureType;

  /** Short description */
  @Prop({ default: () => null })
  description?: string;

  /** Texture tags */
  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }] })
  tags: Tag[];

  /** In which pack this texture is used */
  @Prop({ required: true })
  packs: string[];

  /** Texture configuration, depends on the texture type */
  @Prop({ type: Object, required: true })
  configuration: ITexture['type'] extends 'atlas'
    ? Required<Pick<ITextureConfiguration, 'size' | 'map' | 'uses'>>
    : ITexture['type'] extends 'sprite'
    ? Required<Pick<ITextureConfiguration, 'tint' | 'mcmeta' | 'uses'>>
    : never;

  @Prop({ default: () => null })
  modifiedAt?: Date;

  @Prop({ default: () => null })
  createdAt: Date;
}

export const TextureSchema = SchemaFactory.createForClass(Texture);

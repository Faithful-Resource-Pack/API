import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  NonEmptyArray,
  IPack,
  TMinecraftEdition,
  TMinecraftVersion,
  ITexture,
  TMinecraftPackType,
  TMinecraftPackResolution,
} from 'src/types';

export type PackDocument = Pack & Document;

@Schema()
export class Pack implements IPack {
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: false })
  aliases?: string[];

  @Prop({ required: true, type: String, enum: ['resource_pack', 'texture_pack'] })
  type: TMinecraftPackType | unknown;

  @Prop({ required: true })
  edition: TMinecraftEdition;

  @Prop({ required: true })
  resolution: TMinecraftPackResolution;

  @Prop({ required: true })
  versions: NonEmptyArray<TMinecraftVersion>;

  @Prop({ required: true, select: false })
  textures: NonEmptyArray<ITexture['id']>;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: true })
  git: string;

  @Prop({ required: false, type: Object, default: {} })
  socials?: { [key: string]: string; twitter?: string; discord?: string; github?: string };
}

export const PackSchema = SchemaFactory.createForClass(Pack);

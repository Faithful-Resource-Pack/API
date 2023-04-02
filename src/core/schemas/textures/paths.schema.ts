import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { ITexturePath, NonEmptyArray, TMinecraftTextureExtension, TMinecraftVersion } from 'src/types';

@Schema()
export class TexturePath implements ITexturePath {
  @Prop({ required: true, type: String })
  @ApiProperty({ example: 'textures/block/stone', required: true, type: String })
  path: string;

  @Prop({ required: true, type: [String] })
  @ApiProperty({ example: ['1.16.5'], required: true, type: [String] })
  versions: NonEmptyArray<TMinecraftVersion>;

  @Prop({ required: true, enum: ['png', 'tga'] })
  @ApiProperty({ example: 'png', required: true, enum: ['png', 'tga'] })
  extension: TMinecraftTextureExtension;
}

export const TexturePathSchema = SchemaFactory.createForClass(TexturePath);

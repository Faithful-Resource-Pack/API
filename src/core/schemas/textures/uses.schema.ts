import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  ITextureUse,
  ITextureUseJavaResourcePack,
  ITextureUseJavaTexturePack,
  ITextureUseOtherEditions,
  TMinecraftEdition,
  NonEmptyArray,
} from 'src/types';
import { TexturePath, TexturePathSchema } from './paths.schema';
import { ApiProperty } from '@nestjs/swagger';

@Schema()
export class TextureUse implements ITextureUse {
  @Prop({
    required: true,
    type: [TexturePathSchema],
    validate: [(v: NonEmptyArray<TexturePath>) => v.length > 0, '{PATH} must have at least one use'],
  })
  @ApiProperty({
    example: [
      {
        versions: ['1.16.5'],
        path: 'textures/gui/advancements/backgrounds/stone',
        extension: 'png',
      },
    ],
  })
  paths: NonEmptyArray<TexturePath>;
}

@Schema()
export class TextureUseJavaResourcePack extends TextureUse implements ITextureUseJavaResourcePack {
  @Prop({ required: true, enum: ['java'] })
  @ApiProperty({ example: 'java', required: true, enum: ['java'] })
  edition: 'java';

  @Prop({ required: true, enum: ['resource_pack'] })
  @ApiProperty({ example: 'resource_pack', required: true, enum: ['resource_pack'] })
  type: 'resource_pack';

  @Prop({ required: true, type: String })
  @ApiProperty({ example: 'minecraft', required: true, type: String })
  assets: string;
}

@Schema()
export class TextureUseJavaTexturePack extends TextureUse implements ITextureUseJavaTexturePack {
  @Prop({ required: true, enum: ['java'] })
  @ApiProperty({ example: 'java', required: true, enum: ['java'] })
  edition: 'java';

  @Prop({ required: true, enum: ['texture_pack'] })
  @ApiProperty({ example: 'texture_pack', required: true, enum: ['texture_pack'] })
  type: 'texture_pack';
}

@Schema()
export class TextureUseOtherEditions extends TextureUse implements ITextureUseOtherEditions {
  @Prop({ required: true, type: String, enum: ['bedrock', 'education', 'dungeons', 'legends'] })
  @ApiProperty({ example: 'bedrock', required: true, type: String, enum: ['bedrock', 'education', 'dungeons', 'legends'] })
  edition: Exclude<TMinecraftEdition, 'java'>;
}

export const TextureUseJavaResourcePackSchema = SchemaFactory.createForClass(TextureUseJavaResourcePack);
export const TextureUseJavaTexturePackSchema = SchemaFactory.createForClass(TextureUseJavaTexturePack);
export const TextureUseOtherEditionsSchema = SchemaFactory.createForClass(TextureUseOtherEditions);

export type TextureUseJavaResourcePackDocument = TextureUseJavaResourcePack & Document;
export type TextureUseJavaTexturePackDocument = TextureUseJavaTexturePack & Document;
export type TextureUseOtherEditionsDocument = TextureUseOtherEditions & Document;

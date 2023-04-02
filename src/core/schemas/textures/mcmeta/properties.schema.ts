import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IPropertiesMCMETA } from 'src/types';

@Schema({ _id: false })
class PropertiesMCMETAContent {
  @Prop({ required: false, type: Boolean, default: false })
  @ApiProperty({ example: false, required: false, type: Boolean })
  blur?: boolean;

  @Prop({ required: true, type: Boolean })
  @ApiProperty({ example: false, required: false, type: Boolean })
  clamp?: boolean;

  @Prop({ required: true, type: [Number] })
  @ApiProperty({ example: [0, 1], required: true, type: [Number] })
  mipmaps: Array<number>;
}

const PropertiesMCMETAContentSchema = SchemaFactory.createForClass(PropertiesMCMETAContent);

@Schema({ _id: false })
export class PropertiesMCMETA implements IPropertiesMCMETA {
  @Prop({ required: true, type: PropertiesMCMETAContentSchema })
  @ApiProperty({ example: { blur: false, clamp: false, mipmaps: [0, 1] }, required: true, type: PropertiesMCMETAContentSchema })
  texture: IPropertiesMCMETA['texture'];
}

export const PropertiesMCMETASchema = SchemaFactory.createForClass(PropertiesMCMETA);

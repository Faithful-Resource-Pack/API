import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IAnimationMCMETA } from 'src/types';

@Schema({ _id: false })
class AnimationMCMETAFrame {
  @Prop({ required: true, type: Number })
  @ApiProperty({ example: 0, required: true, type: Number })
  index: number;

  @Prop({ required: true, type: Number })
  @ApiProperty({ example: 1, required: true, type: Number })
  time: number;
}

const AnimationMCMETAFrameSchema = SchemaFactory.createForClass(AnimationMCMETAFrame);

@Schema({ _id: false })
class AnimationMCMETAContent {
  @Prop({ required: false, type: Boolean, default: false })
  @ApiProperty({ example: false, required: false, type: Boolean })
  interpolate?: boolean;

  @Prop({ required: true, type: Number })
  @ApiProperty({ example: 16, required: true, type: Number })
  width: number;

  @Prop({ required: true, type: Number })
  @ApiProperty({ example: 32, required: true, type: Number })
  height: number;

  @Prop({ required: false, type: Number, default: 1 })
  @ApiProperty({ example: 1, required: false, type: Number })
  frametime?: number;

  @Prop({ required: true, type: [Number, AnimationMCMETAFrameSchema] })
  @ApiProperty({ example: [0, 1], required: true, type: [Number, AnimationMCMETAFrameSchema] })
  frames: IAnimationMCMETA['animation']['frames'];
}

const AnimationMCMETAContentSchema = SchemaFactory.createForClass(AnimationMCMETAContent);

@Schema({ _id: false })
export class AnimationMCMETA implements IAnimationMCMETA {
  @Prop({ required: true, type: AnimationMCMETAContentSchema })
  @ApiProperty({
    example: { interpolate: false, width: 16, height: 32, frametime: 1, frames: [0, 1] },
    required: true,
    type: AnimationMCMETAContentSchema,
  })
  animation: IAnimationMCMETA['animation'];
}

export const AnimationMCMETASchema = SchemaFactory.createForClass(AnimationMCMETA);

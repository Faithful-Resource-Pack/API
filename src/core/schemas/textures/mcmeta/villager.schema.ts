import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IVillagersMCMETA } from 'src/types';

@Schema({ _id: false })
class VillagerMCMETAContent {
  @Prop({ required: true, enum: ['full', 'partial'] })
  @ApiProperty({ example: 'full', required: true, enum: ['full', 'partial'] })
  hat: 'full' | 'partial';
}

const VillagerMCMETAContentSchema = SchemaFactory.createForClass(VillagerMCMETAContent);

@Schema({ _id: false })
export class VillagerMCMETA implements IVillagersMCMETA {
  @Prop({ required: true, type: VillagerMCMETAContentSchema })
  @ApiProperty({ example: { hat: 'full' }, required: true, type: VillagerMCMETAContentSchema })
  villager: { hat: 'full' | 'partial' };
}

export const VillagerMCMETASchema = SchemaFactory.createForClass(VillagerMCMETA);

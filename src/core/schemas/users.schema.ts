import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import type { IUser } from 'src/types';
import { ROLES } from '../decorators/roles.decorator';

export type UserDocument = User & Document;

@Schema()
export class User implements IUser {
  @Prop({ required: true })
  username: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ required: true, type: Array, enum: ROLES, default: [ROLES.USER] })
  roles: ROLES[];

  @Prop({ required: true, type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ required: true, type: Date, default: Date.now })
  updatedAt: Date;

  @Prop({ required: false, type: Date })
  deletedAt?: Date;

  @Prop({ required: false, type: Date })
  lastLogin?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

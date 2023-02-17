import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/core/schemas/users.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async createUser(username: string, password: string): Promise<User> {
    const user = new this.userModel({ username, password });
    return user.save();
  }

  async findOne(query: object): Promise<User | undefined> {
    return this.userModel.findOne(query).exec();
  }

  async findOneWithPassword(query: object): Promise<User | undefined> {
    return this.userModel.findOne(query, { password: true }).exec();
  }
}

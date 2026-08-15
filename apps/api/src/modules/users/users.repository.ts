import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type {
  Model,
  Types,
} from 'mongoose';

import {
  User,
  type UserDocument,
} from './schemas/user.schema';

export interface CreateUserRecord {
  publicId: string;
  name: string;
  email: string;
  passwordHash: string;
}

@Injectable()
export class UsersRepository {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  create(
    input: CreateUserRecord,
  ): Promise<UserDocument> {
    return this.userModel.create(input);
  }

  findByEmail(
    email: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email })
      .exec();
  }

  findByEmailWithPassword(
    email: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email })
      .select('+passwordHash')
      .exec();
  }

  findByPublicId(
    publicId: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ publicId })
      .exec();
  }

    findByInternalId(
    userId: Types.ObjectId,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ _id: userId })
      .exec();
  }
}
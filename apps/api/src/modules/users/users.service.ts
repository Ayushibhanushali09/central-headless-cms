import {
  ConflictException,
  Injectable,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { ulid } from 'ulid';

import { UserResponseDto } from './dto/user-response.dto';
import type { UserDocument } from './schemas/user.schema';
import { UsersRepository } from './users.repository';
import type { Types } from 'mongoose';

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
  ) {}

  async createUser(
    input: CreateUserInput,
  ): Promise<UserResponseDto> {
    const normalizedEmail = input.email
      .trim()
      .toLowerCase();

    const existingUser =
      await this.usersRepository.findByEmail(
        normalizedEmail,
      );

    if (existingUser) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_REGISTERED',
        message:
          'An account with this email already exists.',
      });
    }

    const passwordHash = await argon2.hash(
      input.password,
      {
        type: argon2.argon2id,
        memoryCost: 19_456,
        timeCost: 2,
        parallelism: 1,
      },
    );

    try {
      const user = await this.usersRepository.create({
        publicId: `usr_${ulid()}`,
        name: input.name.trim(),
        email: normalizedEmail,
        passwordHash,
      });

      return this.toResponse(user);
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException({
          code: 'EMAIL_ALREADY_REGISTERED',
          message:
            'An account with this email already exists.',
        });
      }

      throw error;
    }
  }

  findByEmailWithPassword(
    email: string,
  ): Promise<UserDocument | null> {
    return this.usersRepository.findByEmailWithPassword(
      email.trim().toLowerCase(),
    );
  }

  findByPublicId(
    publicId: string,
  ): Promise<UserDocument | null> {
    return this.usersRepository.findByPublicId(publicId);
  }

    findByInternalId(
    userId: Types.ObjectId,
  ): Promise<UserDocument | null> {
    return this.usersRepository.findByInternalId(userId);
  }

  toResponse(user: UserDocument): UserResponseDto {
    return {
      id: user.publicId,
      name: user.name,
      email: user.email,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private isDuplicateKeyError(
    error: unknown,
  ): error is { code: number } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: number }).code === 11000
    );
  }
}
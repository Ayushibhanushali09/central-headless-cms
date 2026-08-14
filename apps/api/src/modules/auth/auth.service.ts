import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

import { UserStatus } from '../users/schemas/user.schema';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { UsersService } from '../users/users.service';
import type {
  AccessTokenPayload,
  AuthenticatedUser,
  LoginResponse,
} from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { parseTokenTtlToSeconds } from './token-ttl';

@Injectable()
export class AuthService {
  private readonly accessTokenExpiresIn: number;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    configService: ConfigService,
  ) {
    this.accessTokenExpiresIn =
      parseTokenTtlToSeconds(
        configService.getOrThrow<string>(
          'JWT_ACCESS_TTL',
        ),
      );
  }

  register(
    registerDto: RegisterDto,
  ): Promise<UserResponseDto> {
    return this.usersService.createUser({
      name: registerDto.name,
      email: registerDto.email,
      password: registerDto.password,
    });
  }

  async login(
    loginDto: LoginDto,
  ): Promise<LoginResponse> {
    const user =
      await this.usersService.findByEmailWithPassword(
        loginDto.email,
      );

    if (
      !user ||
      !user.passwordHash ||
      user.status !== UserStatus.Active
    ) {
      throw this.invalidCredentials();
    }

    const passwordValid = await argon2.verify(
      user.passwordHash,
      loginDto.password,
    );

    if (!passwordValid) {
      throw this.invalidCredentials();
    }

    const payload: AccessTokenPayload = {
      sub: user.publicId,
      email: user.email,
      type: 'access',
    };

    const accessToken = await this.jwtService.signAsync(
      payload,
      {
        expiresIn: this.accessTokenExpiresIn,
      },
    );

    const authenticatedUser: AuthenticatedUser = {
      id: user.publicId,
      name: user.name,
      email: user.email,
      status: user.status,
    };

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.accessTokenExpiresIn,
      user: authenticatedUser,
    };
  }

  private invalidCredentials(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'INVALID_CREDENTIALS',
      message: 'Email or password is incorrect.',
    });
  }
}
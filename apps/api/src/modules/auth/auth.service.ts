import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

import { UserStatus } from '../users/schemas/user.schema';
import type { UserDocument } from '../users/schemas/user.schema';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { UsersService } from '../users/users.service';
import type {
  AccessTokenPayload,
  AuthenticatedUser,
  AuthSessionResult,
  LoginResponse,
} from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { SessionMetadata } from './sessions/refresh-session.types';
import { RefreshSessionsService } from './sessions/refresh-sessions.service';
import { parseTokenTtlToSeconds } from './token-ttl';

@Injectable()
export class AuthService {
  private readonly accessTokenExpiresIn: number;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly refreshSessionsService: RefreshSessionsService,
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
    metadata: SessionMetadata,
  ): Promise<AuthSessionResult> {
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

    const [loginResponse, refreshSession] =
      await Promise.all([
        this.issueAccessToken(user),
        this.refreshSessionsService.createSession(
          user._id,
          metadata,
        ),
      ]);

    return {
      ...loginResponse,
      refreshToken: refreshSession.rawToken,
      refreshTokenExpiresAt:
        refreshSession.expiresAt,
    };
  }

  async refresh(
    rawRefreshToken: string,
    metadata: SessionMetadata,
  ): Promise<AuthSessionResult> {
    const rotated =
      await this.refreshSessionsService.rotateSession(
        rawRefreshToken,
        metadata,
      );

    const user = await this.usersService.findByInternalId(
      rotated.userId,
    );

    if (!user || user.status !== UserStatus.Active) {
      await this.refreshSessionsService.revokeAllForUser(
        rotated.userId,
      );

      throw new UnauthorizedException({
        code: 'USER_NOT_ACTIVE',
        message: 'User account is not active.',
      });
    }

    const loginResponse = await this.issueAccessToken(user);

    return {
      ...loginResponse,
      refreshToken: rotated.rawToken,
      refreshTokenExpiresAt: rotated.expiresAt,
    };
  }

  logout(rawRefreshToken: string): Promise<void> {
    return this.refreshSessionsService.revokeToken(
      rawRefreshToken,
    );
  }

  async logoutAll(
    userPublicId: string,
  ): Promise<number> {
    const user = await this.usersService.findByPublicId(
      userPublicId,
    );

    if (!user) {
      return 0;
    }

    return this.refreshSessionsService.revokeAllForUser(
      user._id,
    );
  }

  private async issueAccessToken(
    user: UserDocument,
  ): Promise<LoginResponse> {
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
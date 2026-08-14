import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import {
  ExtractJwt,
  Strategy,
} from 'passport-jwt';

import { UserStatus } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import type {
  AccessTokenPayload,
  AuthenticatedUser,
} from './auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(
  Strategy,
  'jwt',
) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest:
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.getOrThrow<string>(
          'JWT_ACCESS_SECRET',
        ),
    });
  }

  async validate(
    payload: AccessTokenPayload,
  ): Promise<AuthenticatedUser> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException({
        code: 'INVALID_ACCESS_TOKEN',
        message: 'Access token is invalid.',
      });
    }

    const user = await this.usersService.findByPublicId(
      payload.sub,
    );

    if (!user || user.status !== UserStatus.Active) {
      throw new UnauthorizedException({
        code: 'USER_NOT_ACTIVE',
        message: 'User account is not active.',
      });
    }

    return {
      id: user.publicId,
      name: user.name,
      email: user.email,
      status: user.status,
    };
  }
}
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  CookieOptions,
  Request,
  Response,
} from 'express';

import type {
  AuthenticatedUser,
  LoginResponse,
} from './auth.types';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { SessionMetadata } from './sessions/refresh-session.types';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  private readonly cookieName: string;
  private readonly cookieOptions: CookieOptions;

  constructor(
    private readonly authService: AuthService,
    configService: ConfigService,
  ) {
    this.cookieName =
      configService.getOrThrow<string>(
        'AUTH_REFRESH_COOKIE_NAME',
      );

    const domain = configService.get<string>(
      'AUTH_COOKIE_DOMAIN',
    );

    this.cookieOptions = {
      httpOnly: true,
      secure: configService.getOrThrow<boolean>(
        'AUTH_COOKIE_SECURE',
      ),
      sameSite: configService.getOrThrow<
        'lax' | 'strict' | 'none'
      >('AUTH_COOKIE_SAME_SITE'),
      path: '/api/v1/auth',
      ...(domain ? { domain } : {}),
    };
  }

  @Public()
  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponse> {
    const result = await this.authService.login(
      loginDto,
      this.sessionMetadata(request),
    );

    this.setRefreshCookie(
      response,
      result.refreshToken,
      result.refreshTokenExpiresAt,
    );

    return this.publicLoginResponse(result);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponse> {
    const rawRefreshToken =
      request.cookies?.[this.cookieName];

    if (typeof rawRefreshToken !== 'string') {
      throw new UnauthorizedException({
        code: 'REFRESH_TOKEN_MISSING',
        message: 'Refresh session is missing.',
      });
    }

    const result = await this.authService.refresh(
      rawRefreshToken,
      this.sessionMetadata(request),
    );

    this.setRefreshCookie(
      response,
      result.refreshToken,
      result.refreshTokenExpiresAt,
    );

    return this.publicLoginResponse(result);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const rawRefreshToken =
      request.cookies?.[this.cookieName];

    if (typeof rawRefreshToken === 'string') {
      await this.authService.logout(rawRefreshToken);
    }

    this.clearRefreshCookie(response);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logoutAll(user.id);
    this.clearRefreshCookie(response);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(
    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return user;
  }

  private sessionMetadata(
    request: Request,
  ): SessionMetadata {
    return {
      userAgent:
        request.get('user-agent') ?? null,
      ipAddress:
        request.ip ??
        request.socket.remoteAddress ??
        null,
    };
  }

  private setRefreshCookie(
    response: Response,
    rawToken: string,
    expiresAt: Date,
  ): void {
    response.cookie(
      this.cookieName,
      rawToken,
      {
        ...this.cookieOptions,
        expires: expiresAt,
      },
    );
  }

  private clearRefreshCookie(
    response: Response,
  ): void {
    response.clearCookie(
      this.cookieName,
      this.cookieOptions,
    );
  }

  private publicLoginResponse(
    result: LoginResponse & {
      refreshToken: string;
      refreshTokenExpiresAt: Date;
    },
  ): LoginResponse {
    return {
      accessToken: result.accessToken,
      tokenType: result.tokenType,
      expiresIn: result.expiresIn,
      user: result.user,
    };
  }
}
import { Injectable } from '@nestjs/common';

import { UserResponseDto } from '../users/dto/user-response.dto';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  register(
    registerDto: RegisterDto,
  ): Promise<UserResponseDto> {
    return this.usersService.createUser({
      name: registerDto.name,
      email: registerDto.email,
      password: registerDto.password,
    });
  }
}
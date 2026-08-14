import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

function trimString(value: unknown): unknown {
  return typeof value === 'string'
    ? value.trim()
    : value;
}

export class RegisterDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.trim().toLowerCase()
      : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(128)
  @Matches(/[a-z]/, {
    message:
      'password must contain a lowercase letter',
  })
  @Matches(/[A-Z]/, {
    message:
      'password must contain an uppercase letter',
  })
  @Matches(/\d/, {
    message: 'password must contain a number',
  })
  password!: string;
}
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { PageVisibility } from '../schemas/page.schema';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeSlug(value: unknown): unknown {
  return typeof value === 'string'
    ? value.trim().toLowerCase()
    : value;
}

export class CreatePageDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @Transform(({ value }) => normalizeSlug(value))
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'endpointSlug must contain lowercase letters, numbers and single hyphens only.',
  })
  @MaxLength(100)
  endpointSlug?: string;

  @IsOptional()
  @IsEnum(PageVisibility)
  visibility?: PageVisibility;
}
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  MaxLength,
} from 'class-validator';

import { ProjectRole } from '../schemas/project-member.schema';

export const ASSIGNABLE_PROJECT_ROLES = [
  ProjectRole.Admin,
  ProjectRole.Editor,
  ProjectRole.Viewer,
] as const;

export type AssignableProjectRole =
  (typeof ASSIGNABLE_PROJECT_ROLES)[number];

export class AddProjectMemberDto {
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.trim().toLowerCase()
      : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsIn(ASSIGNABLE_PROJECT_ROLES)
  role!: AssignableProjectRole;
}
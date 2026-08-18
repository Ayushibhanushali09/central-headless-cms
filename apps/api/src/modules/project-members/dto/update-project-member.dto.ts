import { IsIn } from 'class-validator';

import {
  ASSIGNABLE_PROJECT_ROLES,
  type AssignableProjectRole,
} from './add-project-member.dto';

export class UpdateProjectMemberDto {
  @IsIn(ASSIGNABLE_PROJECT_ROLES)
  role!: AssignableProjectRole;
}
import { UserStatus } from '../../users/schemas/user.schema';
import {
  ProjectMemberStatus,
  ProjectRole,
} from '../schemas/project-member.schema';

export class ProjectMemberResponseDto {
  userId!: string;
  name!: string;
  email!: string;
  userStatus!: UserStatus;
  role!: ProjectRole;
  status!: ProjectMemberStatus;
  acceptedAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}
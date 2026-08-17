import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Types } from 'mongoose';

import { UserStatus } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import type { ProjectMemberDocument } from './schemas/project-member.schema';
import type { ProjectRole } from './schemas/project-member.schema';
import { ProjectMembersService } from './project-members.service';

@Injectable()
export class ProjectAuthorizationService {
  constructor(
    private readonly usersService: UsersService,
    private readonly projectMembersService: ProjectMembersService,
  ) {}

  async requireRoles(
    userPublicId: string,
    projectId: Types.ObjectId,
    allowedRoles: readonly ProjectRole[],
  ): Promise<ProjectMemberDocument> {
    const user = await this.usersService.findByPublicId(
      userPublicId,
    );

    if (!user || user.status !== UserStatus.Active) {
      throw new UnauthorizedException({
        code: 'USER_NOT_ACTIVE',
        message: 'User account is not active.',
      });
    }

    return this.projectMembersService.requireRoles(
      projectId,
      user._id,
      allowedRoles,
    );
  }
}
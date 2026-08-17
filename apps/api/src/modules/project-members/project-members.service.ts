import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Types } from 'mongoose';

import { ProjectMembersRepository } from './project-members.repository';
import {
  type ProjectMemberDocument,
  ProjectMemberStatus,
  ProjectRole,
} from './schemas/project-member.schema';

@Injectable()
export class ProjectMembersService {
  constructor(
    private readonly repository: ProjectMembersRepository,
  ) {}

  createOwner(
    projectId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<ProjectMemberDocument> {
    return this.repository.create({
      projectId,
      userId,
      role: ProjectRole.Owner,
      status: ProjectMemberStatus.Active,
      invitedBy: null,
      acceptedAt: new Date(),
    });
  }

  async getActiveMembership(
    projectId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<ProjectMemberDocument> {
    const membership =
      await this.repository.findActiveMembership(
        projectId,
        userId,
      );

    if (!membership) {
      throw new NotFoundException({
        code: 'PROJECT_NOT_FOUND',
        message: 'Project was not found.',
      });
    }

    return membership;
  }

  async requireRoles(
    projectId: Types.ObjectId,
    userId: Types.ObjectId,
    allowedRoles: readonly ProjectRole[],
  ): Promise<ProjectMemberDocument> {
    const membership = await this.getActiveMembership(
      projectId,
      userId,
    );

    if (!allowedRoles.includes(membership.role)) {
      throw new ForbiddenException({
        code: 'PROJECT_PERMISSION_DENIED',
        message:
          'You do not have permission for this Project action.',
      });
    }

    return membership;
  }

  findActiveProjectsForUser(
    userId: Types.ObjectId,
  ): Promise<ProjectMemberDocument[]> {
    return this.repository.findActiveProjectsForUser(
      userId,
    );
  }
}
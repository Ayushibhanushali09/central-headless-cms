import { UnauthorizedException } from '@nestjs/common';
import { Types } from 'mongoose';

import { UsersService } from '../users/users.service';
import { ProjectAuthorizationService } from './project-authorization.service';
import { PROJECT_ADMIN_ROLES } from './project-permissions';
import { ProjectMembersService } from './project-members.service';
import type { ProjectMemberDocument } from './schemas/project-member.schema';
import { ProjectRole } from './schemas/project-member.schema';
import type { UserDocument } from '../users/schemas/user.schema';
import { UserStatus } from '../users/schemas/user.schema';

const userId = new Types.ObjectId();
const projectId = new Types.ObjectId();
const userPublicId = 'usr_test';

describe('ProjectAuthorizationService', () => {
  const usersService = {
    findByPublicId: jest.fn(),
  } as unknown as UsersService;

  const projectMembersService = {
    requireRoles: jest.fn(),
  } as unknown as ProjectMembersService;

  let service: ProjectAuthorizationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProjectAuthorizationService(
      usersService,
      projectMembersService,
    );
  });

  it('passes internal User ID to role validation', async () => {
    jest
      .spyOn(usersService, 'findByPublicId')
      .mockResolvedValue({
        _id: userId,
        publicId: userPublicId,
        status: UserStatus.Active,
      } as UserDocument);

    jest
      .spyOn(projectMembersService, 'requireRoles')
      .mockResolvedValue({
        projectId,
        userId,
        role: ProjectRole.Owner,
      } as ProjectMemberDocument);

    await service.requireRoles(
      userPublicId,
      projectId,
      PROJECT_ADMIN_ROLES,
    );

    expect(
      projectMembersService.requireRoles,
    ).toHaveBeenCalledWith(
      projectId,
      userId,
      PROJECT_ADMIN_ROLES,
    );
  });

  it('rejects disabled User', async () => {
    jest
      .spyOn(usersService, 'findByPublicId')
      .mockResolvedValue({
        _id: userId,
        publicId: userPublicId,
        status: UserStatus.Disabled,
      } as UserDocument);

    await expect(
      service.requireRoles(
        userPublicId,
        projectId,
        PROJECT_ADMIN_ROLES,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
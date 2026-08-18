import {
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Types } from 'mongoose';

import type { UserDocument } from '../users/schemas/user.schema';
import { UserStatus } from '../users/schemas/user.schema';
import { UsersRepository } from '../users/users.repository';
import { ProjectMemberManagementService } from './project-member-management.service';
import { ProjectMembersRepository } from './project-members.repository';
import {
  type ProjectMemberDocument,
  ProjectMemberStatus,
  ProjectRole,
} from './schemas/project-member.schema';

const projectId = new Types.ObjectId();
const actorUserId = new Types.ObjectId();
const targetUserId = new Types.ObjectId();

function actor(
  role: ProjectRole,
): ProjectMemberDocument {
  return {
    _id: new Types.ObjectId(),
    projectId,
    userId: actorUserId,
    role,
    status: ProjectMemberStatus.Active,
  } as ProjectMemberDocument;
}

function member(
  role: ProjectRole,
  status = ProjectMemberStatus.Active,
): ProjectMemberDocument {
  return {
    _id: new Types.ObjectId(),
    projectId,
    userId: targetUserId,
    role,
    status,
    acceptedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as ProjectMemberDocument;
}

function targetUser(): UserDocument {
  return {
    _id: targetUserId,
    publicId: 'usr_target',
    name: 'Target User',
    email: 'target@example.com',
    status: UserStatus.Active,
  } as UserDocument;
}

describe('ProjectMemberManagementService', () => {
  const projectMembersRepository = {
    findAllForProject: jest.fn(),
    findMembership: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
  } as unknown as ProjectMembersRepository;

  const usersRepository = {
    findByEmail: jest.fn(),
    findByPublicId: jest.fn(),
    findByIds: jest.fn(),
  } as unknown as UsersRepository;

  let service: ProjectMemberManagementService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProjectMemberManagementService(
      projectMembersRepository,
      usersRepository,
    );
  });

  it('allows Owner to add an Admin', async () => {
    const created = member(ProjectRole.Admin);

    jest
      .spyOn(usersRepository, 'findByEmail')
      .mockResolvedValue(targetUser());

    jest
      .spyOn(
        projectMembersRepository,
        'findMembership',
      )
      .mockResolvedValue(null);

    jest
      .spyOn(projectMembersRepository, 'create')
      .mockResolvedValue(created);

    const result = await service.addMember(
      projectId,
      actor(ProjectRole.Owner),
      {
        email: 'target@example.com',
        role: ProjectRole.Admin,
      },
    );

    expect(result.role).toBe(ProjectRole.Admin);
    expect(projectMembersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId,
        userId: targetUserId,
        role: ProjectRole.Admin,
        status: ProjectMemberStatus.Active,
        invitedBy: actorUserId,
      }),
    );
  });

  it('rejects Admin assigning Admin role', async () => {
    jest
      .spyOn(usersRepository, 'findByEmail')
      .mockResolvedValue(targetUser());

    await expect(
      service.addMember(
        projectId,
        actor(ProjectRole.Admin),
        {
          email: 'target@example.com',
          role: ProjectRole.Admin,
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects duplicate active membership', async () => {
    jest
      .spyOn(usersRepository, 'findByEmail')
      .mockResolvedValue(targetUser());

    jest
      .spyOn(
        projectMembersRepository,
        'findMembership',
      )
      .mockResolvedValue(member(ProjectRole.Viewer));

    await expect(
      service.addMember(
        projectId,
        actor(ProjectRole.Owner),
        {
          email: 'target@example.com',
          role: ProjectRole.Editor,
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('protects Owner membership from modification', async () => {
    jest
      .spyOn(usersRepository, 'findByPublicId')
      .mockResolvedValue(targetUser());

    jest
      .spyOn(
        projectMembersRepository,
        'findMembership',
      )
      .mockResolvedValue(member(ProjectRole.Owner));

    await expect(
      service.updateRole(
        projectId,
        'usr_target',
        actor(ProjectRole.Owner),
        {
          role: ProjectRole.Viewer,
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows Admin to disable a Viewer', async () => {
    const targetMembership = member(
      ProjectRole.Viewer,
    );

    jest
      .spyOn(usersRepository, 'findByPublicId')
      .mockResolvedValue(targetUser());

    jest
      .spyOn(
        projectMembersRepository,
        'findMembership',
      )
      .mockResolvedValue(targetMembership);

    jest
      .spyOn(projectMembersRepository, 'updateById')
      .mockResolvedValue({
        ...targetMembership,
        status: ProjectMemberStatus.Disabled,
      } as ProjectMemberDocument);

    await service.disableMember(
      projectId,
      'usr_target',
      actor(ProjectRole.Admin),
    );

    expect(
      projectMembersRepository.updateById,
    ).toHaveBeenCalledWith(
      targetMembership._id,
      {
        status: ProjectMemberStatus.Disabled,
      },
    );
  });
});
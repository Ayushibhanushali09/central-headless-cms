import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';

import { ProjectMembersRepository } from './project-members.repository';
import { ProjectMembersService } from './project-members.service';
import {
  type ProjectMemberDocument,
  ProjectMemberStatus,
  ProjectRole,
} from './schemas/project-member.schema';

const projectId = new Types.ObjectId();
const userId = new Types.ObjectId();

function membership(
  role: ProjectRole,
): ProjectMemberDocument {
  return {
    projectId,
    userId,
    role,
    status: ProjectMemberStatus.Active,
  } as ProjectMemberDocument;
}

describe('ProjectMembersService', () => {
  const repository = {
    create: jest.fn(),
    findActiveMembership: jest.fn(),
    findActiveProjectsForUser: jest.fn(),
  } as unknown as ProjectMembersRepository;

  let service: ProjectMembersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProjectMembersService(repository);
  });

  it('creates an Owner membership', async () => {
    jest
      .spyOn(repository, 'create')
      .mockResolvedValue(membership(ProjectRole.Owner));

    await service.createOwner(projectId, userId);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId,
        userId,
        role: ProjectRole.Owner,
        status: ProjectMemberStatus.Active,
      }),
    );
  });

  it('hides missing membership as Project not found', async () => {
    jest
      .spyOn(repository, 'findActiveMembership')
      .mockResolvedValue(null);

    await expect(
      service.getActiveMembership(projectId, userId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a role outside the allowed list', async () => {
    jest
      .spyOn(repository, 'findActiveMembership')
      .mockResolvedValue(membership(ProjectRole.Viewer));

    await expect(
      service.requireRoles(
        projectId,
        userId,
        [ProjectRole.Owner, ProjectRole.Admin],
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
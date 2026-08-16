import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';

import { ProjectMembersService } from '../project-members/project-members.service';
import type { ProjectMemberDocument } from '../project-members/schemas/project-member.schema';
import {
  ProjectMemberStatus,
  ProjectRole,
} from '../project-members/schemas/project-member.schema';
import type { UserDocument } from '../users/schemas/user.schema';
import { UserStatus } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { ProjectsService } from './projects.service';
import {
  type ProjectDocument,
  ProjectStatus,
} from './schemas/project.schema';

const userObjectId = new Types.ObjectId();
const projectObjectId = new Types.ObjectId();

const userPublicId =
  'usr_01JTESTUSER000000000000000';

const projectPublicId =
  'prj_01JTESTPROJECT000000000000';

function createUserDocument(
  overrides: Partial<UserDocument> = {},
): UserDocument {
  return {
    _id: userObjectId,
    publicId: userPublicId,
    name: 'Test User',
    email: 'test@example.com',
    status: UserStatus.Active,
    emailVerifiedAt: null,
    createdAt: new Date(
      '2026-07-01T09:00:00.000Z',
    ),
    updatedAt: new Date(
      '2026-07-01T09:00:00.000Z',
    ),
    ...overrides,
  } as UserDocument;
}

function createProjectDocument(
  overrides: Partial<ProjectDocument> = {},
): ProjectDocument {
  return {
    _id: projectObjectId,
    publicId: projectPublicId,
    name: 'Demo Website',
    description: 'Test project',
    createdBy: userObjectId,
    status: ProjectStatus.Active,
    createdAt: new Date(
      '2026-07-01T10:00:00.000Z',
    ),
    updatedAt: new Date(
      '2026-07-02T10:00:00.000Z',
    ),
    ...overrides,
  } as ProjectDocument;
}

function createOwnerMembership(): ProjectMemberDocument {
  return {
    _id: new Types.ObjectId(),
    projectId: projectObjectId,
    userId: userObjectId,
    role: ProjectRole.Owner,
    status: ProjectMemberStatus.Active,
    invitedBy: null,
    acceptedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as ProjectMemberDocument;
}

describe('ProjectsService', () => {
  const create = jest.fn();
  const find = jest.fn();
  const findOne = jest.fn();
  const deleteOne = jest.fn();

  const projectModel = {
    create,
    find,
    findOne,
    deleteOne,
  } as unknown as Model<ProjectDocument>;

  const usersService = {
    findByPublicId: jest.fn(),
  } as unknown as UsersService;

  const projectMembersService = {
    createOwner: jest.fn(),
    findActiveProjectsForUser: jest.fn(),
    getActiveMembership: jest.fn(),
  } as unknown as ProjectMembersService;

  let service: ProjectsService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new ProjectsService(
      projectModel,
      usersService,
      projectMembersService,
    );

    jest
      .spyOn(usersService, 'findByPublicId')
      .mockResolvedValue(createUserDocument());

    deleteOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        deletedCount: 1,
      }),
    });
  });

  it('creates a Project and Owner membership', async () => {
    const project = createProjectDocument();
    const ownerMembership =
      createOwnerMembership();

    create.mockResolvedValue(project);

    jest
      .spyOn(projectMembersService, 'createOwner')
      .mockResolvedValue(ownerMembership);

    const result = await service.create(
      {
        name: ' Demo Website ',
        description: ' Test project ',
      },
      userPublicId,
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        publicId: expect.stringMatching(
          /^prj_[0-9A-HJKMNP-TV-Z]{26}$/,
        ),
        name: 'Demo Website',
        description: 'Test project',
        createdBy: userObjectId,
        status: ProjectStatus.Active,
      }),
    );

    expect(
      projectMembersService.createOwner,
    ).toHaveBeenCalledWith(
      project._id,
      userObjectId,
    );

    expect(result).toEqual({
      id: project.publicId,
      name: project.name,
      description: project.description,
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    });

    expect(result).not.toHaveProperty('_id');
    expect(result).not.toHaveProperty('createdBy');
  });

  it('removes Project when Owner membership creation fails', async () => {
    const project = createProjectDocument();

    create.mockResolvedValue(project);

    jest
      .spyOn(projectMembersService, 'createOwner')
      .mockRejectedValue(
        new Error('Membership creation failed'),
      );

    await expect(
      service.create(
        {
          name: 'Demo Website',
        },
        userPublicId,
      ),
    ).rejects.toThrow(
      'Membership creation failed',
    );

    expect(deleteOne).toHaveBeenCalledWith({
      _id: project._id,
    });
  });

  it('lists only Projects from active User memberships', async () => {
    const project = createProjectDocument();
    const membership = createOwnerMembership();

    jest
      .spyOn(
        projectMembersService,
        'findActiveProjectsForUser',
      )
      .mockResolvedValue([membership]);

    const exec = jest
      .fn()
      .mockResolvedValue([project]);

    const sort = jest.fn().mockReturnValue({
      exec,
    });

    find.mockReturnValue({
      sort,
    });

    const result = await service.findAllForUser(
      userPublicId,
    );

    expect(
      projectMembersService.findActiveProjectsForUser,
    ).toHaveBeenCalledWith(userObjectId);

    expect(find).toHaveBeenCalledWith({
      _id: {
        $in: [projectObjectId],
      },
      status: ProjectStatus.Active,
    });

    expect(sort).toHaveBeenCalledWith({
      updatedAt: -1,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(
      project.publicId,
    );
  });

  it('returns empty list when User has no Project memberships', async () => {
    jest
      .spyOn(
        projectMembersService,
        'findActiveProjectsForUser',
      )
      .mockResolvedValue([]);

    const result = await service.findAllForUser(
      userPublicId,
    );

    expect(result).toEqual([]);
    expect(find).not.toHaveBeenCalled();
  });

  it('returns one Project only when membership exists', async () => {
    const project = createProjectDocument();
    const membership = createOwnerMembership();

    findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(project),
    });

    jest
      .spyOn(
        projectMembersService,
        'getActiveMembership',
      )
      .mockResolvedValue(membership);

    const result = await service.findOneForUser(
      projectPublicId,
      userPublicId,
    );

    expect(
      projectMembersService.getActiveMembership,
    ).toHaveBeenCalledWith(
      projectObjectId,
      userObjectId,
    );

    expect(result.id).toBe(projectPublicId);
  });

  it('rejects Project lookup when membership is missing', async () => {
    const project = createProjectDocument();

    findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(project),
    });

    jest
      .spyOn(
        projectMembersService,
        'getActiveMembership',
      )
      .mockRejectedValue(
        new NotFoundException({
          code: 'PROJECT_NOT_FOUND',
          message: 'Project was not found.',
        }),
      );

    await expect(
      service.findOneForUser(
        projectPublicId,
        userPublicId,
      ),
    ).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws NotFoundException for unknown Project', async () => {
    findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.findOneForUser(
        'prj_unknown',
        userPublicId,
      ),
    ).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(
      projectMembersService.getActiveMembership,
    ).not.toHaveBeenCalled();
  });

  it('rejects inactive User', async () => {
    jest
      .spyOn(usersService, 'findByPublicId')
      .mockResolvedValue(
        createUserDocument({
          status: UserStatus.Disabled,
        }),
      );

    await expect(
      service.findAllForUser(userPublicId),
    ).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(
      projectMembersService.findActiveProjectsForUser,
    ).not.toHaveBeenCalled();
  });

  it('converts duplicate-key error to ConflictException', async () => {
    create.mockRejectedValue({
      code: 11000,
    });

    await expect(
      service.create(
        {
          name: 'Demo Website',
        },
        userPublicId,
      ),
    ).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(
      projectMembersService.createOwner,
    ).not.toHaveBeenCalled();
  });
});
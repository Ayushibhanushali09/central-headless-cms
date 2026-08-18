import { Types } from 'mongoose';

import type { AuthenticatedUser } from '../auth/auth.types';
import { ProjectsService } from '../projects/projects.service';
import type { ProjectDocument } from '../projects/schemas/project.schema';
import { ProjectAuthorizationService } from './project-authorization.service';
import { ProjectMemberManagementService } from './project-member-management.service';
import { ProjectMembersController } from './project-members.controller';
import { PROJECT_ADMIN_ROLES } from './project-permissions';
import type { ProjectMemberDocument } from './schemas/project-member.schema';
import { ProjectRole } from './schemas/project-member.schema';

const projectId = new Types.ObjectId();
const actorUserId = new Types.ObjectId();

const authenticatedUser = {
  id: 'usr_actor',
} as AuthenticatedUser;

const project = {
  _id: projectId,
  publicId: 'prj_test',
} as ProjectDocument;

const actorMembership = {
  userId: actorUserId,
  projectId,
  role: ProjectRole.Owner,
} as ProjectMemberDocument;

describe('ProjectMembersController', () => {
  const projectsService = {
    findActiveDocument: jest.fn(),
  } as unknown as ProjectsService;

  const authorizationService = {
    requireRoles: jest.fn(),
  } as unknown as ProjectAuthorizationService;

  const managementService = {
    listMembers: jest.fn(),
    addMember: jest.fn(),
    updateRole: jest.fn(),
    disableMember: jest.fn(),
  } as unknown as ProjectMemberManagementService;

  let controller: ProjectMembersController;

  beforeEach(() => {
    jest.clearAllMocks();

    controller = new ProjectMembersController(
      projectsService,
      authorizationService,
      managementService,
    );

    jest
      .spyOn(projectsService, 'findActiveDocument')
      .mockResolvedValue(project);

    jest
      .spyOn(authorizationService, 'requireRoles')
      .mockResolvedValue(actorMembership);
  });

  it('authorizes Owner/Admin before listing members', async () => {
    jest
      .spyOn(managementService, 'listMembers')
      .mockResolvedValue([]);

    await controller.listMembers(
      'prj_test',
      authenticatedUser,
    );

    expect(
      authorizationService.requireRoles,
    ).toHaveBeenCalledWith(
      authenticatedUser.id,
      projectId,
      PROJECT_ADMIN_ROLES,
    );

    expect(
      managementService.listMembers,
    ).toHaveBeenCalledWith(projectId);
  });

  it('passes actor membership into add-member policy', async () => {
    const input = {
      email: 'target@example.com',
      role: ProjectRole.Viewer,
    } as const;

    jest
      .spyOn(managementService, 'addMember')
      .mockResolvedValue({
        userId: 'usr_target',
        name: 'Target User',
        email: input.email,
        userStatus: 'active',
        role: ProjectRole.Viewer,
        status: 'active',
        acceptedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

    await controller.addMember(
      'prj_test',
      input,
      authenticatedUser,
    );

    expect(managementService.addMember).toHaveBeenCalledWith(
      projectId,
      actorMembership,
      input,
    );
  });
});
import type { AuthenticatedUser } from '../auth/auth.types';
import { UserStatus } from '../users/schemas/user.schema';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ProjectStatus } from './schemas/project.schema';

const authenticatedUser: AuthenticatedUser = {
  id: 'usr_01JTESTUSER000000000000000',
  name: 'Test User',
  email: 'test@example.com',
  status: UserStatus.Active,
};

const projectResponse = {
  id: 'prj_01JTESTPROJECT000000000000',
  name: 'Demo Website',
  description: 'Test project',
  status: ProjectStatus.Active,
  createdAt: new Date('2026-07-01T10:00:00.000Z'),
  updatedAt: new Date('2026-07-02T10:00:00.000Z'),
};

describe('ProjectsController', () => {
  const projectsService = {
    create: jest.fn(),
    findAllForUser: jest.fn(),
    findOneForUser: jest.fn(),
  } as unknown as ProjectsService;

  let controller: ProjectsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ProjectsController(projectsService);
  });

  it('delegates Project creation with current User ID', async () => {
    const dto = {
      name: 'Demo Website',
      description: 'Test project',
    };

    jest
      .spyOn(projectsService, 'create')
      .mockResolvedValue(projectResponse);

    await expect(
      controller.create(dto, authenticatedUser),
    ).resolves.toEqual(projectResponse);

    expect(projectsService.create).toHaveBeenCalledWith(
      dto,
      authenticatedUser.id,
    );
  });

  it('delegates User-scoped Project listing', async () => {
    jest
      .spyOn(projectsService, 'findAllForUser')
      .mockResolvedValue([projectResponse]);

    await expect(
      controller.findAll(authenticatedUser),
    ).resolves.toEqual([projectResponse]);

    expect(
      projectsService.findAllForUser,
    ).toHaveBeenCalledWith(authenticatedUser.id);
  });

  it('delegates membership-protected Project lookup', async () => {
    jest
      .spyOn(projectsService, 'findOneForUser')
      .mockResolvedValue(projectResponse);

    await expect(
      controller.findOne(
        projectResponse.id,
        authenticatedUser,
      ),
    ).resolves.toEqual(projectResponse);

    expect(
      projectsService.findOneForUser,
    ).toHaveBeenCalledWith(
      projectResponse.id,
      authenticatedUser.id,
    );
  });
});

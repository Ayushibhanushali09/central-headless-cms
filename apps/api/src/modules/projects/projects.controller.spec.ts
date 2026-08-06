import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ProjectStatus } from './schemas/project.schema';

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
    findAll: jest.fn(),
    findOne: jest.fn(),
  } as unknown as ProjectsService;

  let controller: ProjectsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ProjectsController(projectsService);
  });

  it('delegates project creation to ProjectsService', async () => {
    const dto = {
      name: 'Demo Website',
      description: 'Test project',
    };

    jest
      .spyOn(projectsService, 'create')
      .mockResolvedValue(projectResponse);

    await expect(controller.create(dto)).resolves.toEqual(
      projectResponse,
    );

    expect(projectsService.create).toHaveBeenCalledWith(dto);
  });

  it('delegates project listing to ProjectsService', async () => {
    jest
      .spyOn(projectsService, 'findAll')
      .mockResolvedValue([projectResponse]);

    await expect(controller.findAll()).resolves.toEqual([
      projectResponse,
    ]);
  });

  it('delegates single-project lookup to ProjectsService', async () => {
    jest
      .spyOn(projectsService, 'findOne')
      .mockResolvedValue(projectResponse);

    await expect(
      controller.findOne(projectResponse.id),
    ).resolves.toEqual(projectResponse);

    expect(projectsService.findOne).toHaveBeenCalledWith(
      projectResponse.id,
    );
  });
});
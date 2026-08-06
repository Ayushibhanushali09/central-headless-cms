import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { Model } from 'mongoose';

import { ProjectsService } from './projects.service';
import {
  type ProjectDocument,
  ProjectStatus,
} from './schemas/project.schema';

function createProjectDocument(
  overrides: Partial<ProjectDocument> = {},
): ProjectDocument {
  return {
    publicId: 'prj_01JTESTPROJECT000000000000',
    name: 'Demo Website',
    description: 'Test project',
    status: ProjectStatus.Active,
    createdAt: new Date('2026-07-01T10:00:00.000Z'),
    updatedAt: new Date('2026-07-02T10:00:00.000Z'),
    ...overrides,
  } as ProjectDocument;
}

describe('ProjectsService', () => {
  const create = jest.fn();
  const find = jest.fn();
  const findOne = jest.fn();

  const projectModel = {
    create,
    find,
    findOne,
  } as unknown as Model<ProjectDocument>;

  let service: ProjectsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProjectsService(projectModel);
  });

  it('creates a project with a public ULID and safe response', async () => {
    const document = createProjectDocument();
    create.mockResolvedValue(document);

    const result = await service.create({
      name: ' Demo Website ',
      description: ' Test project ',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        publicId: expect.stringMatching(
          /^prj_[0-9A-HJKMNP-TV-Z]{26}$/,
        ),
        name: 'Demo Website',
        description: 'Test project',
        status: ProjectStatus.Active,
      }),
    );

    expect(result).toEqual({
      id: document.publicId,
      name: document.name,
      description: document.description,
      status: document.status,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });

    expect(result).not.toHaveProperty('_id');
    expect(result).not.toHaveProperty('__v');
  });

  it('lists active projects sorted by updatedAt descending', async () => {
    const document = createProjectDocument();
    const exec = jest.fn().mockResolvedValue([document]);
    const sort = jest.fn().mockReturnValue({ exec });

    find.mockReturnValue({ sort });

    const result = await service.findAll();

    expect(find).toHaveBeenCalledWith({
      status: ProjectStatus.Active,
    });
    expect(sort).toHaveBeenCalledWith({ updatedAt: -1 });
    expect(result).toHaveLength(1);
  });

  it('throws NotFoundException for an unknown project', async () => {
    const exec = jest.fn().mockResolvedValue(null);
    findOne.mockReturnValue({ exec });

    await expect(
      service.findOne('prj_unknown'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('converts Mongo duplicate-key error to ConflictException', async () => {
    create.mockRejectedValue({ code: 11000 });

    await expect(
      service.create({ name: 'Demo Website' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
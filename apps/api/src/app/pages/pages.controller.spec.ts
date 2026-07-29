import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';
import {
  PageStatus,
  PageVisibility,
} from './schemas/page.schema';

const pageResponse = {
  id: 'pg_01JTESTPAGE0000000000000000',
  projectId: 'prj_01JTESTPROJECT000000000000',
  name: 'Home Page',
  endpointSlug: 'home-page',
  visibility: PageVisibility.Private,
  status: PageStatus.Active,
  deliveryEndpoint:
    '/v1/content/pg_01JTESTPAGE0000000000000000',
  createdAt: new Date('2026-07-01T10:00:00.000Z'),
  updatedAt: new Date('2026-07-02T10:00:00.000Z'),
};

describe('PagesController', () => {
  const pagesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
  } as unknown as PagesService;

  let controller: PagesController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new PagesController(pagesService);
  });

  it('delegates page creation', async () => {
    const dto = { name: 'Home Page' };

    jest
      .spyOn(pagesService, 'create')
      .mockResolvedValue(pageResponse);

    await expect(
      controller.create(pageResponse.projectId, dto),
    ).resolves.toEqual(pageResponse);
  });

  it('delegates page listing', async () => {
    jest
      .spyOn(pagesService, 'findAll')
      .mockResolvedValue([pageResponse]);

    await expect(
      controller.findAll(pageResponse.projectId),
    ).resolves.toEqual([pageResponse]);
  });

  it('delegates page lookup', async () => {
    jest
      .spyOn(pagesService, 'findOne')
      .mockResolvedValue(pageResponse);

    await expect(
      controller.findOne(pageResponse.id),
    ).resolves.toEqual(pageResponse);
  });
});
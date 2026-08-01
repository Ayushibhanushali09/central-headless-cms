import { PageContentController } from './page-content.controller';
import { PageContentService } from './page-content.service';

const pageId = 'pg_01JTESTPAGE0000000000000000';

const contentResponse = {
  pageId,
  schemaVersion: 1,
  schemaHash: 'a'.repeat(64),
  draftData: null,
  draftVersion: 0,
  draftUpdatedAt: null,
  publishedData: null,
  publishedVersion: 0,
  publishedFromDraftVersion: 0,
  publishedAt: null,
  hasUnpublishedChanges: false,
  updatedAt: new Date(),
};

describe('PageContentController', () => {
  const pageContentService = {
    getContent: jest.fn(),
    saveDraft: jest.fn(),
    publish: jest.fn(),
  } as unknown as PageContentService;

  let controller: PageContentController;

  beforeEach(() => {
    jest.clearAllMocks();

    controller = new PageContentController(
      pageContentService,
    );
  });

  it('delegates content retrieval', async () => {
    jest
      .spyOn(pageContentService, 'getContent')
      .mockResolvedValue(contentResponse);

    await expect(
      controller.getContent(pageId),
    ).resolves.toEqual(contentResponse);

    expect(
      pageContentService.getContent,
    ).toHaveBeenCalledWith(pageId);
  });

  it('delegates Draft save', async () => {
    const requestDto = {
      contentData: {
        hero: {
          heading: 'Welcome',
        },
      },
    };

    const savedResponse = {
      ...contentResponse,
      draftData: requestDto.contentData,
      draftVersion: 1,
      draftUpdatedAt: new Date(),
      hasUnpublishedChanges: true,
    };

    jest
      .spyOn(pageContentService, 'saveDraft')
      .mockResolvedValue(savedResponse);

    await expect(
      controller.saveDraft(pageId, requestDto),
    ).resolves.toEqual(savedResponse);

    expect(
      pageContentService.saveDraft,
    ).toHaveBeenCalledWith(pageId, requestDto);
  });

  it('delegates Publish', async () => {
    const requestDto = {
      expectedDraftVersion: 2,
    };

    const publishedData = {
      hero: {
        heading: 'Welcome',
      },
    };

    const publishedResponse = {
      ...contentResponse,
      draftData: publishedData,
      draftVersion: 2,
      draftUpdatedAt: new Date(),
      publishedData,
      publishedVersion: 1,
      publishedFromDraftVersion: 2,
      publishedAt: new Date(),
      hasUnpublishedChanges: false,
    };

    jest
      .spyOn(pageContentService, 'publish')
      .mockResolvedValue(publishedResponse);

    await expect(
      controller.publish(pageId, requestDto),
    ).resolves.toEqual(publishedResponse);

    expect(
      pageContentService.publish,
    ).toHaveBeenCalledWith(pageId, requestDto);
  });
});
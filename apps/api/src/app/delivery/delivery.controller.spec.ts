import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';

const pageId = 'pg_01JTESTPAGE0000000000000000';

describe('DeliveryController', () => {
  const deliveryService = {
    getPublishedContent: jest.fn(),
  } as unknown as DeliveryService;

  let controller: DeliveryController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new DeliveryController(deliveryService);
  });

  it('returns the raw published object from the service', async () => {
    const publishedContent = {
      hero: {
        heading: 'Published Homepage',
      },
    };

    jest
      .spyOn(deliveryService, 'getPublishedContent')
      .mockResolvedValue(publishedContent);

    await expect(
      controller.getPublishedContent(pageId),
    ).resolves.toEqual(publishedContent);

    expect(
      deliveryService.getPublishedContent,
    ).toHaveBeenCalledWith(pageId);
  });
});
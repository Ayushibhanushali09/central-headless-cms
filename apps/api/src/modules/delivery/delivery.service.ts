import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';

import {
  PagePublication,
  type PagePublicationDocument,
  PublicationStatus,
} from '../pages/schemas/page-publication.schema';
import { PageVisibility } from '../pages/schemas/page.schema';

@Injectable()
export class DeliveryService {
  constructor(
    @InjectModel(PagePublication.name)
    private readonly pagePublicationModel: Model<PagePublicationDocument>,
  ) {}

  async getPublishedContent(
    pagePublicId: string,
  ): Promise<Record<string, unknown>> {
    const publication = await this.pagePublicationModel
      .findOne({
        pagePublicId,
        visibility: PageVisibility.Public,
        status: PublicationStatus.Published,
        publishedVersion: {
          $gte: 1,
        },
      })
      .select({
        publishedData: 1,
      })
      .exec();

    if (!publication?.publishedData) {
      this.throwContentNotFound();
    }

    return publication.publishedData;
  }

  private throwContentNotFound(): never {
    throw new NotFoundException({
      code: 'CONTENT_NOT_FOUND',
      message: 'Published content was not found.',
    });
  }
}
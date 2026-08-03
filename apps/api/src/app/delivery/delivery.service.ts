import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';

import { PagesService } from '../pages/pages.service';
import {
  PageData,
  type PageDataDocument,
} from '../pages/schemas/page-data.schema';
import {
  type PageDocument,
  PageVisibility,
} from '../pages/schemas/page.schema';

@Injectable()
export class DeliveryService {
  constructor(
    @InjectModel(PageData.name)
    private readonly pageDataModel: Model<PageDataDocument>,

    private readonly pagesService: PagesService,
  ) {}

  async getPublishedContent(
    pagePublicId: string,
  ): Promise<Record<string, unknown>> {
    const page = await this.findPublicPage(pagePublicId);

    const pageData = await this.pageDataModel
      .findOne({ pageId: page._id })
      .exec();

    if (
      !pageData ||
      pageData.publishedData === null ||
      pageData.publishedVersion < 1
    ) {
      this.throwContentNotFound();
    }

    return pageData.publishedData;
  }

  private async findPublicPage(
    pagePublicId: string,
  ): Promise<PageDocument> {
    let page: PageDocument;

    try {
      page = await this.pagesService.findActiveDocument(
        pagePublicId,
      );
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        this.throwContentNotFound();
      }

      throw error;
    }

    if (page.visibility !== PageVisibility.Public) {
      this.throwContentNotFound();
    }

    return page;
  }

  private throwContentNotFound(): never {
    throw new NotFoundException({
      code: 'CONTENT_NOT_FOUND',
      message: 'Published content was not found.',
    });
  }
}
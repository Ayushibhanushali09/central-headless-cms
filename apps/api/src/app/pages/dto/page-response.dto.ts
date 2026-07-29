import {
  PageStatus,
  PageVisibility,
} from '../schemas/page.schema';

export class PageResponseDto {
  id!: string;
  projectId!: string;
  name!: string;
  endpointSlug!: string;
  visibility!: PageVisibility;
  status!: PageStatus;
  deliveryEndpoint!: string;
  createdAt!: Date;
  updatedAt!: Date;
}
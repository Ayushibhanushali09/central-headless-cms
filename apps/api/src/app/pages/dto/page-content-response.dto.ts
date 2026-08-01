export class PageContentResponseDto {
  pageId!: string;
  schemaVersion!: number;
  schemaHash!: string;
  draftData!: Record<string, unknown> | null;
  draftVersion!: number;
  draftUpdatedAt!: Date | null;
  publishedData!: Record<string, unknown> | null;
  publishedVersion!: number;
  publishedFromDraftVersion!: number;
  publishedAt!: Date | null;
  hasUnpublishedChanges!: boolean;
  updatedAt!: Date;
}
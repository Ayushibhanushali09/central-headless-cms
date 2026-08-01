export class PageSchemaResponseDto {
  pageId!: string;
  schemaDefinition!: Record<string, unknown> | null;
  schemaVersion!: number;
  schemaHash!: string | null;
  updatedAt!: Date;
}
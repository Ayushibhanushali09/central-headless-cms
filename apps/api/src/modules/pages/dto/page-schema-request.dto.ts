import { IsObject } from 'class-validator';

export class PageSchemaRequestDto {
  @IsObject()
  schemaDefinition!: Record<string, unknown>;
}
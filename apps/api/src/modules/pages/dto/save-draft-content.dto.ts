import { IsObject } from 'class-validator';

export class SaveDraftContentDto {
  @IsObject()
  contentData!: Record<string, unknown>;
}
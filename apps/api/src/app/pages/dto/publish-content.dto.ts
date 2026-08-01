import { IsInt, Min } from 'class-validator';

export class PublishContentDto {
  @IsInt()
  @Min(1)
  expectedDraftVersion!: number;
}
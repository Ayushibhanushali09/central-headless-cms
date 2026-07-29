import { ProjectStatus } from '../schemas/project.schema';

export class ProjectResponseDto {
  id!: string;
  name!: string;
  description!: string;
  status!: ProjectStatus;
  createdAt!: Date;
  updatedAt!: Date;
}
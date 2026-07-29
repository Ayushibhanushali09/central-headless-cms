import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, Types } from 'mongoose';
import { ulid } from 'ulid';

import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectResponseDto } from './dto/project-response.dto';
import {
  Project,
  type ProjectDocument,
  ProjectStatus,
} from './schemas/project.schema';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name)
    private readonly projectModel: Model<ProjectDocument>,
  ) {}

  async create(
    createProjectDto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    try {
      const project = await this.projectModel.create({
        publicId: `prj_${ulid()}`,
        name: createProjectDto.name.trim(),
        description:
          createProjectDto.description?.trim() ?? '',
        status: ProjectStatus.Active,
      });

      return this.toResponse(project);
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          'A project with this public ID already exists.',
        );
      }

      throw error;
    }
  }

  async findAll(): Promise<ProjectResponseDto[]> {
    const projects = await this.projectModel
      .find({
        status: ProjectStatus.Active,
      })
      .sort({
        updatedAt: -1,
      })
      .exec();

    return projects.map((project) =>
      this.toResponse(project),
    );
  }

  async findOne(
    publicId: string,
  ): Promise<ProjectResponseDto> {
    const project =
      await this.findActiveDocument(publicId);

    return this.toResponse(project);
  }

  async findActiveDocument(
    publicId: string,
  ): Promise<ProjectDocument> {
    const project = await this.projectModel
      .findOne({
        publicId,
        status: ProjectStatus.Active,
      })
      .exec();

    if (!project) {
      throw new NotFoundException(
        `Project '${publicId}' was not found.`,
      );
    }

    return project;
  }

  async findActiveDocumentByInternalId(
    internalId: Types.ObjectId,
  ): Promise<ProjectDocument> {
    const project = await this.projectModel
      .findOne({
        _id: internalId,
        status: ProjectStatus.Active,
      })
      .exec();

    if (!project) {
      throw new NotFoundException(
        'The project for this page was not found.',
      );
    }

    return project;
  }

  private toResponse(
    project: ProjectDocument,
  ): ProjectResponseDto {
    return {
      id: project.publicId,
      name: project.name,
      description: project.description,
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  private isDuplicateKeyError(
    error: unknown,
  ): error is { code: number } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: number }).code === 11000
    );
  }
}
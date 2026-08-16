import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, Types } from 'mongoose';
import { ulid } from 'ulid';

import { ProjectMembersService } from '../project-members/project-members.service';
import { UsersService } from '../users/users.service';
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

    private readonly usersService: UsersService,

    private readonly projectMembersService: ProjectMembersService,
  ) {}

  async create(
    createProjectDto: CreateProjectDto,
    userPublicId: string,
  ): Promise<ProjectResponseDto> {
    const user = await this.requireActiveUser(
      userPublicId,
    );

    let project: ProjectDocument | null = null;

    try {
      project = await this.projectModel.create({
        publicId: `prj_${ulid()}`,
        name: createProjectDto.name.trim(),
        description:
          createProjectDto.description?.trim() ?? '',
        createdBy: user._id,
        status: ProjectStatus.Active,
      });

      await this.projectMembersService.createOwner(
        project._id,
        user._id,
      );

      return this.toResponse(project);
    } catch (error: unknown) {
      if (project) {
        await this.projectModel
          .deleteOne({ _id: project._id })
          .exec()
          .catch(() => undefined);
      }

      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException({
          code: 'PROJECT_CREATE_CONFLICT',
          message: 'Project could not be created.',
        });
      }

      throw error;
    }
  }

  async findAllForUser(
    userPublicId: string,
  ): Promise<ProjectResponseDto[]> {
    const user = await this.requireActiveUser(
      userPublicId,
    );

    const memberships =
      await this.projectMembersService.findActiveProjectsForUser(
        user._id,
      );

    if (memberships.length === 0) {
      return [];
    }

    const projectIds = memberships.map(
      (membership) => membership.projectId,
    );

    const projects = await this.projectModel
      .find({
        _id: {
          $in: projectIds,
        },
        status: ProjectStatus.Active,
      })
      .sort({ updatedAt: -1 })
      .exec();

    return projects.map((project) =>
      this.toResponse(project),
    );
  }

  async findOneForUser(
    publicId: string,
    userPublicId: string,
  ): Promise<ProjectResponseDto> {
    const user = await this.requireActiveUser(
      userPublicId,
    );

    const project = await this.findActiveDocument(
      publicId,
    );

    await this.projectMembersService.getActiveMembership(
      project._id,
      user._id,
    );

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
      throw new NotFoundException({
        code: 'PROJECT_NOT_FOUND',
        message: 'Project was not found.',
      });
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
      throw new NotFoundException({
        code: 'PROJECT_NOT_FOUND',
        message: 'Project was not found.',
      });
    }

    return project;
  }

  private async requireActiveUser(
    userPublicId: string,
  ) {
    const user = await this.usersService.findByPublicId(
      userPublicId,
    );

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException({
        code: 'USER_NOT_ACTIVE',
        message: 'User account is not active.',
      });
    }

    return user;
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
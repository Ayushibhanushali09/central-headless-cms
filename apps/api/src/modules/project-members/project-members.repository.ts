import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type {
  Model,
  Types,
} from 'mongoose';

import {
  ProjectMember,
  ProjectMemberStatus,
  type ProjectMemberDocument,
  ProjectRole,
} from './schemas/project-member.schema';

export interface CreateProjectMemberRecord {
  projectId: Types.ObjectId;
  userId: Types.ObjectId;
  role: ProjectRole;
  status?: ProjectMemberStatus;
  invitedBy?: Types.ObjectId | null;
  acceptedAt?: Date | null;
}

export interface UpdateProjectMemberRecord {
  role?: ProjectRole;
  status?: ProjectMemberStatus;
  invitedBy?: Types.ObjectId | null;
  acceptedAt?: Date | null;
}

@Injectable()
export class ProjectMembersRepository {
  constructor(
    @InjectModel(ProjectMember.name)
    private readonly model: Model<ProjectMemberDocument>,
  ) {}

  create(
    input: CreateProjectMemberRecord,
  ): Promise<ProjectMemberDocument> {
    return this.model.create(input);
  }

  findMembership(
    projectId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<ProjectMemberDocument | null> {
    return this.model
      .findOne({
        projectId,
        userId,
      })
      .exec();
  }

  findActiveMembership(
    projectId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<ProjectMemberDocument | null> {
    return this.model
      .findOne({
        projectId,
        userId,
        status: ProjectMemberStatus.Active,
      })
      .exec();
  }

  findAllForProject(
    projectId: Types.ObjectId,
  ): Promise<ProjectMemberDocument[]> {
    return this.model
      .find({
        projectId,
      })
      .sort({
        status: 1,
        role: 1,
        createdAt: 1,
      })
      .exec();
  }

  findActiveProjectsForUser(
    userId: Types.ObjectId,
  ): Promise<ProjectMemberDocument[]> {
    return this.model
      .find({
        userId,
        status: ProjectMemberStatus.Active,
      })
      .sort({ updatedAt: -1 })
      .exec();
  }

  updateById(
    membershipId: Types.ObjectId,
    update: UpdateProjectMemberRecord,
  ): Promise<ProjectMemberDocument | null> {
    return this.model
      .findByIdAndUpdate(
        membershipId,
        {
          $set: update,
        },
        {
          new: true,
          runValidators: true,
        },
      )
      .exec();
  }

  countActiveOwners(
    projectId: Types.ObjectId,
  ): Promise<number> {
    return this.model
      .countDocuments({
        projectId,
        role: ProjectRole.Owner,
        status: ProjectMemberStatus.Active,
      })
      .exec();
  }
}
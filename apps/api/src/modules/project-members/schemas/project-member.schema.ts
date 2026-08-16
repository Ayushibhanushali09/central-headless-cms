import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  Schema as MongooseSchema,
  Types,
} from 'mongoose';
import type { HydratedDocument } from 'mongoose';

import { Project } from '../../projects/schemas/project.schema';
import { User } from '../../users/schemas/user.schema';

export enum ProjectRole {
  Owner = 'owner',
  Admin = 'admin',
  Editor = 'editor',
  Viewer = 'viewer',
}

export enum ProjectMemberStatus {
  Active = 'active',
  Invited = 'invited',
  Disabled = 'disabled',
}

@Schema({
  collection: 'project_members',
  timestamps: true,
  versionKey: false,
})
export class ProjectMember {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Project.name,
    required: true,
  })
  projectId!: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(ProjectRole),
  })
  role!: ProjectRole;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(ProjectMemberStatus),
    default: ProjectMemberStatus.Active,
  })
  status!: ProjectMemberStatus;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    default: null,
  })
  invitedBy!: Types.ObjectId | null;

  @Prop({
    type: Date,
    default: null,
  })
  acceptedAt!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export type ProjectMemberDocument =
  HydratedDocument<ProjectMember>;

export const ProjectMemberSchema =
  SchemaFactory.createForClass(ProjectMember);

ProjectMemberSchema.index(
  {
    projectId: 1,
    userId: 1,
  },
  {
    unique: true,
  },
);

ProjectMemberSchema.index({
  userId: 1,
  status: 1,
  updatedAt: -1,
});

ProjectMemberSchema.index({
  projectId: 1,
  status: 1,
  role: 1,
});
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { Types } from 'mongoose';

import type { UserDocument } from '../users/schemas/user.schema';
import { UserStatus } from '../users/schemas/user.schema';
import { UsersRepository } from '../users/users.repository';
import type {
  AddProjectMemberDto,
  AssignableProjectRole,
} from './dto/add-project-member.dto';
import { ProjectMemberResponseDto } from './dto/project-member-response.dto';
import type { UpdateProjectMemberDto } from './dto/update-project-member.dto';
import { ProjectMembersRepository } from './project-members.repository';
import {
  type ProjectMemberDocument,
  ProjectMemberStatus,
  ProjectRole,
} from './schemas/project-member.schema';

const ADMIN_MANAGEABLE_ROLES: readonly ProjectRole[] = [
  ProjectRole.Editor,
  ProjectRole.Viewer,
];

@Injectable()
export class ProjectMemberManagementService {
  constructor(
    private readonly projectMembersRepository: ProjectMembersRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async listMembers(
    projectId: Types.ObjectId,
  ): Promise<ProjectMemberResponseDto[]> {
    const memberships =
      await this.projectMembersRepository.findAllForProject(
        projectId,
      );

    const users = await this.usersRepository.findByIds(
      memberships.map((membership) => membership.userId),
    );

    const usersById = new Map(
      users.map((user) => [
        user._id.toString(),
        user,
      ]),
    );

    return memberships.map((membership) => {
      const user = usersById.get(
        membership.userId.toString(),
      );

      if (!user) {
        throw new InternalServerErrorException({
          code: 'PROJECT_MEMBER_DATA_INTEGRITY_ERROR',
          message:
            'A Project membership references a missing User.',
        });
      }

      return this.toResponse(membership, user);
    });
  }

  async addMember(
    projectId: Types.ObjectId,
    actorMembership: ProjectMemberDocument,
    input: AddProjectMemberDto,
  ): Promise<ProjectMemberResponseDto> {
    const targetUser =
      await this.usersRepository.findByEmail(
        input.email.trim().toLowerCase(),
      );

    if (
      !targetUser ||
      targetUser.status !== UserStatus.Active
    ) {
      throw new NotFoundException({
        code: 'PROJECT_MEMBER_USER_NOT_FOUND',
        message:
          'An active registered User was not found for that email.',
      });
    }

    this.assertNotSelf(
      actorMembership,
      targetUser._id,
    );

    this.assertCanAssignRole(
      actorMembership.role,
      input.role,
    );

    const existingMembership =
      await this.projectMembersRepository.findMembership(
        projectId,
        targetUser._id,
      );

    if (
      existingMembership?.status ===
      ProjectMemberStatus.Active
    ) {
      throw new ConflictException({
        code: 'PROJECT_MEMBER_ALREADY_ACTIVE',
        message:
          'The User is already an active Project member.',
      });
    }

    if (existingMembership) {
      this.assertCanManageCurrentRole(
        actorMembership.role,
        existingMembership.role,
      );

      const reactivated =
        await this.projectMembersRepository.updateById(
          existingMembership._id,
          {
            role: input.role,
            status: ProjectMemberStatus.Active,
            invitedBy: actorMembership.userId,
            acceptedAt: new Date(),
          },
        );

      if (!reactivated) {
        throw this.memberNotFound();
      }

      return this.toResponse(
        reactivated,
        targetUser,
      );
    }

    try {
      const membership =
        await this.projectMembersRepository.create({
          projectId,
          userId: targetUser._id,
          role: input.role,
          status: ProjectMemberStatus.Active,
          invitedBy: actorMembership.userId,
          acceptedAt: new Date(),
        });

      return this.toResponse(
        membership,
        targetUser,
      );
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException({
          code: 'PROJECT_MEMBER_ALREADY_ACTIVE',
          message:
            'The User already has a Project membership.',
        });
      }

      throw error;
    }
  }

  async updateRole(
    projectId: Types.ObjectId,
    targetUserPublicId: string,
    actorMembership: ProjectMemberDocument,
    input: UpdateProjectMemberDto,
  ): Promise<ProjectMemberResponseDto> {
    const targetUser =
      await this.usersRepository.findByPublicId(
        targetUserPublicId,
      );

    if (!targetUser) {
      throw this.memberNotFound();
    }

    this.assertNotSelf(
      actorMembership,
      targetUser._id,
    );

    const targetMembership =
      await this.projectMembersRepository.findMembership(
        projectId,
        targetUser._id,
      );

    if (
      !targetMembership ||
      targetMembership.status !==
        ProjectMemberStatus.Active
    ) {
      throw this.memberNotFound();
    }

    this.assertCanManageCurrentRole(
      actorMembership.role,
      targetMembership.role,
    );

    this.assertCanAssignRole(
      actorMembership.role,
      input.role,
    );

    if (targetMembership.role === input.role) {
      return this.toResponse(
        targetMembership,
        targetUser,
      );
    }

    const updated =
      await this.projectMembersRepository.updateById(
        targetMembership._id,
        {
          role: input.role,
        },
      );

    if (!updated) {
      throw this.memberNotFound();
    }

    return this.toResponse(updated, targetUser);
  }

  async disableMember(
    projectId: Types.ObjectId,
    targetUserPublicId: string,
    actorMembership: ProjectMemberDocument,
  ): Promise<void> {
    const targetUser =
      await this.usersRepository.findByPublicId(
        targetUserPublicId,
      );

    if (!targetUser) {
      throw this.memberNotFound();
    }

    this.assertNotSelf(
      actorMembership,
      targetUser._id,
    );

    const targetMembership =
      await this.projectMembersRepository.findMembership(
        projectId,
        targetUser._id,
      );

    if (
      !targetMembership ||
      targetMembership.status !==
        ProjectMemberStatus.Active
    ) {
      throw this.memberNotFound();
    }

    this.assertCanManageCurrentRole(
      actorMembership.role,
      targetMembership.role,
    );

    const disabled =
      await this.projectMembersRepository.updateById(
        targetMembership._id,
        {
          status: ProjectMemberStatus.Disabled,
        },
      );

    if (!disabled) {
      throw this.memberNotFound();
    }
  }

  private assertNotSelf(
    actorMembership: ProjectMemberDocument,
    targetUserId: Types.ObjectId,
  ): void {
    if (
      actorMembership.userId.toString() ===
      targetUserId.toString()
    ) {
      throw new ForbiddenException({
        code:
          'PROJECT_MEMBER_SELF_MANAGEMENT_FORBIDDEN',
        message:
          'You cannot change your own Project membership.',
      });
    }
  }

  private assertCanAssignRole(
    actorRole: ProjectRole,
    targetRole: AssignableProjectRole,
  ): void {
    if (actorRole === ProjectRole.Owner) {
      return;
    }

    if (
      actorRole === ProjectRole.Admin &&
      ADMIN_MANAGEABLE_ROLES.includes(targetRole)
    ) {
      return;
    }

    throw new ForbiddenException({
      code: 'PROJECT_MEMBER_ROLE_NOT_ASSIGNABLE',
      message:
        'You cannot assign that Project role.',
    });
  }

  private assertCanManageCurrentRole(
    actorRole: ProjectRole,
    targetRole: ProjectRole,
  ): void {
    if (targetRole === ProjectRole.Owner) {
      throw new ConflictException({
        code: 'PROJECT_OWNER_PROTECTED',
        message:
          'Owner membership cannot be changed through this endpoint.',
      });
    }

    if (actorRole === ProjectRole.Owner) {
      return;
    }

    if (
      actorRole === ProjectRole.Admin &&
      ADMIN_MANAGEABLE_ROLES.includes(targetRole)
    ) {
      return;
    }

    throw new ForbiddenException({
      code: 'PROJECT_MEMBER_ROLE_NOT_ASSIGNABLE',
      message:
        'You cannot manage a member with that Project role.',
    });
  }

  private toResponse(
    membership: ProjectMemberDocument,
    user: UserDocument,
  ): ProjectMemberResponseDto {
    return {
      userId: user.publicId,
      name: user.name,
      email: user.email,
      userStatus: user.status,
      role: membership.role,
      status: membership.status,
      acceptedAt: membership.acceptedAt,
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt,
    };
  }

  private memberNotFound(): NotFoundException {
    return new NotFoundException({
      code: 'PROJECT_MEMBER_NOT_FOUND',
      message: 'Project member was not found.',
    });
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
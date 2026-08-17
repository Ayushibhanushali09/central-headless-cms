import { ProjectRole } from './schemas/project-member.schema';

export const PROJECT_READ_ROLES = [
  ProjectRole.Owner,
  ProjectRole.Admin,
  ProjectRole.Editor,
  ProjectRole.Viewer,
] as const;

export const PROJECT_ADMIN_ROLES = [
  ProjectRole.Owner,
  ProjectRole.Admin,
] as const;

export const PROJECT_DRAFT_WRITE_ROLES = [
  ProjectRole.Owner,
  ProjectRole.Admin,
  ProjectRole.Editor,
] as const;

export const PROJECT_PUBLISH_ROLES = [
  ProjectRole.Owner,
  ProjectRole.Admin,
] as const;
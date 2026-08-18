export type ProjectStatus = 'active' | 'archived';

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export type PageVisibility = 'public' | 'private';
export type PageStatus = 'active' | 'archived';

export interface CmsPage {
  id: string;
  projectId: string;
  name: string;
  endpointSlug: string;
  visibility: PageVisibility;
  status: PageStatus;
  deliveryEndpoint: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePageInput {
  name: string;
  endpointSlug?: string;
  visibility?: PageVisibility;
}

export interface SchemaValidationIssue {
  path: string;
  keyword: string;
  message: string;
}

export interface SchemaValidationResult {
  valid: boolean;
  schemaHash: string | null;
  errors: SchemaValidationIssue[];
}

export interface PageSchemaState {
  pageId: string;
  schemaDefinition: Record<string, unknown> | null;
  schemaVersion: number;
  schemaHash: string | null;
  updatedAt: string;
}

export interface PageSchemaInput {
  schemaDefinition: Record<string, unknown>;
}

export interface PageContentState {
  pageId: string;
  schemaVersion: number;
  schemaHash: string;
  draftData: Record<string, unknown> | null;
  draftVersion: number;
  draftUpdatedAt: string | null;
  publishedData: Record<string, unknown> | null;
  publishedVersion: number;
  publishedFromDraftVersion: number;
  publishedAt: string | null;
  hasUnpublishedChanges: boolean;
  updatedAt: string;
}

export interface SaveDraftInput {
  contentData: Record<string, unknown>;
}

export interface PublishContentInput {
  expectedDraftVersion: number;
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'disabled';
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AuthenticatedUser;
}

export interface RegisteredUser extends AuthenticatedUser {
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ProjectRole =
  | 'owner'
  | 'admin'
  | 'editor'
  | 'viewer';

export type AssignableProjectRole = Exclude<
  ProjectRole,
  'owner'
>;

export type ProjectMemberStatus =
  | 'active'
  | 'invited'
  | 'disabled';

export interface ProjectMember {
  userId: string;
  name: string;
  email: string;
  userStatus: 'active' | 'disabled';
  role: ProjectRole;
  status: ProjectMemberStatus;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AddProjectMemberInput {
  email: string;
  role: AssignableProjectRole;
}

export interface UpdateProjectMemberInput {
  role: AssignableProjectRole;
}
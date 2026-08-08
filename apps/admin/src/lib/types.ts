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
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
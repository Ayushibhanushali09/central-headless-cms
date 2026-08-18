import {
  clearAccessToken,
  getAccessToken,
  refreshAccessToken,
  setAccessToken,
} from './auth-session';
import {
  getControlApiUrl,
  getDeliveryApiUrl,
} from './environment';
import type {
  AuthenticatedUser,
  CmsPage,
  CreatePageInput,
  CreateProjectInput,
  LoginInput,
  LoginResponse,
  PageContentState,
  PageSchemaInput,
  PageSchemaState,
  Project,
  PublishContentInput,
  RegisteredUser,
  RegisterInput,
  SaveDraftInput,
  SchemaValidationResult,
  AddProjectMemberInput,
  ProjectMember,
  UpdateProjectMemberInput,
} from './types';

interface ErrorPayload {
  code?: string;
  message?: string | string[];
  details?: unknown;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

interface RequestOptions {
  retryAuth?: boolean;
  includeAuth?: boolean;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function controlUrl(path: string): string {
  return `${getControlApiUrl()}${path}`;
}

async function parsePayload<T>(
  response: Response,
): Promise<ErrorPayload | T | null> {
  const contentType =
    response.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
    return null;
  }

  return response.json().catch(() => null) as Promise<
    ErrorPayload | T | null
  >;
}

function createApiError(
  response: Response,
  payload: ErrorPayload | null,
): ApiError {
  const message = Array.isArray(payload?.message)
    ? payload.message.join(', ')
    : payload?.error?.message ??
      payload?.message ??
      `Request failed with status ${response.status}`;

  return new ApiError(
    message,
    response.status,
    payload?.error?.code ?? payload?.code,
    payload?.error?.details ?? payload?.details,
  );
}

async function request<T>(
  url: string,
  init?: RequestInit,
  options: RequestOptions = {},
): Promise<T> {
  const {
    retryAuth = true,
    includeAuth = true,
  } = options;

  const headers = new Headers(init?.headers);

  headers.set('Accept', 'application/json');

  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAccessToken();

  if (includeAuth && token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...init,
    headers,
    cache: 'no-store',
    credentials: 'include',
  });

  if (
    response.status === 401 &&
    retryAuth &&
    includeAuth
  ) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      return request<T>(url, init, {
        retryAuth: false,
        includeAuth: true,
      });
    }
  }

  const payload = await parsePayload<T>(response);

  if (!response.ok) {
    throw createApiError(
      response,
      payload as ErrorPayload | null,
    );
  }

  return payload as T;
}

export async function login(
  input: LoginInput,
): Promise<LoginResponse> {
  const session = await request<LoginResponse>(
    controlUrl('/auth/login'),
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    {
      retryAuth: false,
      includeAuth: false,
    },
  );

  setAccessToken(session.accessToken);

  return session;
}

export function register(
  input: RegisterInput,
): Promise<RegisteredUser> {
  return request<RegisteredUser>(
    controlUrl('/auth/register'),
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    {
      retryAuth: false,
      includeAuth: false,
    },
  );
}

export async function restoreSession(): Promise<LoginResponse | null> {
  return refreshAccessToken();
}

export function getCurrentUser(): Promise<AuthenticatedUser> {
  return request<AuthenticatedUser>(
    controlUrl('/auth/me'),
  );
}

export async function logout(): Promise<void> {
  try {
    await request<void>(
      controlUrl('/auth/logout'),
      {
        method: 'POST',
      },
      {
        retryAuth: false,
        includeAuth: false,
      },
    );
  } finally {
    clearAccessToken();
  }
}

export function getProjects(): Promise<Project[]> {
  return request<Project[]>(controlUrl('/projects'));
}

export function getProject(
  projectId: string,
): Promise<Project> {
  return request<Project>(
    controlUrl(`/projects/${projectId}`),
  );
}

export function createProject(
  input: CreateProjectInput,
): Promise<Project> {
  return request<Project>(controlUrl('/projects'), {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getProjectPages(
  projectId: string,
): Promise<CmsPage[]> {
  return request<CmsPage[]>(
    controlUrl(`/projects/${projectId}/pages`),
  );
}

export function getPage(
  pageId: string,
): Promise<CmsPage> {
  return request<CmsPage>(
    controlUrl(`/pages/${pageId}`),
  );
}

export function createPage(
  projectId: string,
  input: CreatePageInput,
): Promise<CmsPage> {
  return request<CmsPage>(
    controlUrl(`/projects/${projectId}/pages`),
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export function getDeliveryUrl(
  pageId: string,
): string {
  return `${getDeliveryApiUrl()}/content/${pageId}`;
}

export function getPublishedContent(
  pageId: string,
): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>(
    getDeliveryUrl(pageId),
    undefined,
    {
      retryAuth: false,
      includeAuth: false,
    },
  );
}

export function getPageSchema(
  pageId: string,
): Promise<PageSchemaState> {
  return request<PageSchemaState>(
    controlUrl(`/pages/${pageId}/schema`),
  );
}

export function validatePageSchema(
  pageId: string,
  input: PageSchemaInput,
): Promise<SchemaValidationResult> {
  return request<SchemaValidationResult>(
    controlUrl(`/pages/${pageId}/schema/validate`),
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export function savePageSchema(
  pageId: string,
  input: PageSchemaInput,
): Promise<PageSchemaState> {
  return request<PageSchemaState>(
    controlUrl(`/pages/${pageId}/schema`),
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  );
}

export function getPageContent(
  pageId: string,
): Promise<PageContentState> {
  return request<PageContentState>(
    controlUrl(`/pages/${pageId}/content`),
  );
}

export function savePageDraft(
  pageId: string,
  input: SaveDraftInput,
): Promise<PageContentState> {
  return request<PageContentState>(
    controlUrl(`/pages/${pageId}/content/draft`),
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  );
}

export function publishPageContent(
  pageId: string,
  input: PublishContentInput,
): Promise<PageContentState> {
  return request<PageContentState>(
    controlUrl(`/pages/${pageId}/content/publish`),
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export function getProjectMembers(
  projectId: string,
): Promise<ProjectMember[]> {
  return request<ProjectMember[]>(
    controlUrl(`/projects/${projectId}/members`),
  );
}

export function addProjectMember(
  projectId: string,
  input: AddProjectMemberInput,
): Promise<ProjectMember> {
  return request<ProjectMember>(
    controlUrl(`/projects/${projectId}/members`),
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export function updateProjectMember(
  projectId: string,
  targetUserId: string,
  input: UpdateProjectMemberInput,
): Promise<ProjectMember> {
  return request<ProjectMember>(
    controlUrl(
      `/projects/${projectId}/members/${targetUserId}`,
    ),
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  );
}

export function disableProjectMember(
  projectId: string,
  targetUserId: string,
): Promise<void> {
  return request<void>(
    controlUrl(
      `/projects/${projectId}/members/${targetUserId}`,
    ),
    {
      method: 'DELETE',
    },
  );
}
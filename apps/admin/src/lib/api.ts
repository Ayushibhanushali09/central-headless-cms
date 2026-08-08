import type {
  CmsPage,
  CreatePageInput,
  CreateProjectInput,
  Project,
  PageSchemaInput,
  PageSchemaState,
  SchemaValidationResult,
} from './types';

const controlApiUrl =
  process.env.NEXT_PUBLIC_CONTROL_API_URL?.replace(
    /\/$/,
    '',
  );

const deliveryApiUrl =
  process.env.NEXT_PUBLIC_DELIVERY_API_URL?.replace(
    /\/$/,
    '',
  );

interface ErrorPayload {
  message?: string | string[];
  error?: {
    message?: string;
  };
}

function requireEnvironment(
  value: string | undefined,
  name: string,
): string {
  if (!value) {
    throw new Error(
      `${name} is missing. Check apps/admin/.env.local.`,
    );
  }

  return value;
}

async function request<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      ...(init?.body
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...init?.headers,
    },
  });

  const payload = (await response
    .json()
    .catch(() => null)) as ErrorPayload | T | null;

  if (!response.ok) {
    const errorPayload = payload as ErrorPayload | null;
    const message = Array.isArray(errorPayload?.message)
      ? errorPayload.message.join(', ')
      : errorPayload?.error?.message ??
        errorPayload?.message ??
        `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return payload as T;
}

function controlUrl(path: string): string {
  return `${requireEnvironment(
    controlApiUrl,
    'NEXT_PUBLIC_CONTROL_API_URL',
  )}${path}`;
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

export function getPage(pageId: string): Promise<CmsPage> {
  return request<CmsPage>(controlUrl(`/pages/${pageId}`));
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

export function getDeliveryUrl(pageId: string): string {
  return `${requireEnvironment(
    deliveryApiUrl,
    'NEXT_PUBLIC_DELIVERY_API_URL',
  )}/content/${pageId}`;
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
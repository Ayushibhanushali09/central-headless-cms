import {
  expect,
  test,
  type Page,
} from '@playwright/test';

const projectName =
  process.env.E2E_PROJECT_NAME ?? 'Valueye Website';

const pageName =
  process.env.E2E_PAGE_NAME ?? 'Home Page';

const pageId = process.env.E2E_PAGE_ID;

const apiBaseUrl =
  process.env.E2E_API_URL ?? 'http://localhost:4000';

const userEmail = process.env.E2E_USER_EMAIL;
const userPassword = process.env.E2E_USER_PASSWORD;

async function authenticatePage(
  page: Page,
): Promise<void> {
  if (!userEmail || !userPassword) {
    throw new Error(
      'E2E_USER_EMAIL and E2E_USER_PASSWORD are required.',
    );
  }

  const response = await page.request.post(
    `${apiBaseUrl}/api/v1/auth/login`,
    {
      data: {
        email: userEmail,
        password: userPassword,
      },
    },
  );

  expect(response.ok()).toBeTruthy();
}

test.describe.configure({
  mode: 'serial',
});

test.describe('Central CMS approved workflow', () => {
  test('backend health is ready', async ({ request }) => {
    const response = await request.get(
      `${apiBaseUrl}/api/v1/health`,
    );

    expect(response.ok()).toBeTruthy();

    const body = (await response.json()) as {
      status: string;
      services: {
        api: string;
        mongodb: string;
        redis: string;
      };
    };

    expect(body.status).toBe('ok');

    expect(body.services).toEqual({
      api: 'up',
      mongodb: 'up',
      redis: 'up',
    });
  });

  test('Projects Dashboard loads live data', async ({
    page,
  }) => {
    await authenticatePage(page);

    await page.goto('/dashboard', {
      waitUntil: 'domcontentloaded',
    });

    await expect(
      page.getByRole('heading', {
        name: 'Projects',
        level: 1,
        exact: true,
      }),
    ).toBeVisible({
      timeout: 15_000,
    });

    await expect(
      page.getByText(projectName, {
        exact: true,
      }),
    ).toBeVisible({
      timeout: 15_000,
    });

    await page
      .getByRole('button', {
        name: /New Project/i,
        exact: true,
      })
      .click();

    await expect(
      page.getByRole('heading', {
        name: 'Create Project',
        exact: true,
      }),
    ).toBeVisible();

    await page
      .getByRole('button', {
        name: 'Close form',
        exact: true,
      })
      .click();

    await expect(
      page.getByRole('heading', {
        name: 'Create Project',
        exact: true,
      }),
    ).not.toBeVisible();
  });

  test('Project opens its real Pages list', async ({
    page,
  }) => {
    await authenticatePage(page);

    await page.goto('/dashboard', {
      waitUntil: 'domcontentloaded',
    });

    const projectLink = page.getByText(projectName, {
      exact: true,
    });

    await expect(projectLink).toBeVisible({
      timeout: 15_000,
    });

    await projectLink.click();

    await expect(
      page.getByRole('heading', {
        name: projectName,
        level: 1,
        exact: true,
      }),
    ).toBeVisible({
      timeout: 15_000,
    });

    await expect(
      page.getByText(pageName, {
        exact: true,
      }),
    ).toBeVisible({
      timeout: 15_000,
    });

    await expect(
      page.getByRole('button', {
        name: /New Page/i,
        exact: true,
      }),
    ).toBeVisible();
  });

  test('Page Schema, Content and Publish screens navigate', async ({
    page,
  }) => {
    await authenticatePage(page);

    await page.goto('/dashboard', {
      waitUntil: 'domcontentloaded',
    });

    const projectLink = page.getByText(projectName, {
      exact: true,
    });

    await expect(projectLink).toBeVisible({
      timeout: 15_000,
    });

    await projectLink.click();

    const pageLink = page.getByText(pageName, {
      exact: true,
    });

    await expect(pageLink).toBeVisible({
      timeout: 15_000,
    });

    await pageLink.click();

    await expect(
      page.getByRole('heading', {
        name: 'JSON Schema',
        exact: true,
      }),
    ).toBeVisible({
      timeout: 15_000,
    });

    await expect(
      page.getByRole('link', {
        name: 'Schema',
        exact: true,
      }),
    ).toBeVisible();

    await page
      .getByRole('link', {
        name: 'Content',
        exact: true,
      })
      .click();

    await expect(
      page.getByRole('heading', {
        name: 'Draft Content',
        exact: true,
      }),
    ).toBeVisible({
      timeout: 15_000,
    });

    await page
      .getByRole('link', {
        name: 'Publish & API',
        exact: true,
      })
      .click();

    await expect(
      page.getByRole('heading', {
        name: 'Delivery Endpoint',
        exact: true,
      }),
    ).toBeVisible({
      timeout: 15_000,
    });

    await expect(
      page.getByText('Published version', {
        exact: true,
      }),
    ).toBeVisible();
  });

  test('unknown route displays custom 404', async ({
    page,
  }) => {
    await page.goto('/this-route-does-not-exist', {
      waitUntil: 'domcontentloaded',
    });

    await expect(
      page.getByRole('heading', {
        name: 'Page not found',
        exact: true,
      }),
    ).toBeVisible({
      timeout: 15_000,
    });

    await expect(
      page.getByRole('link', {
        name: 'Back to Dashboard',
        exact: true,
      }),
    ).toBeVisible();
  });

  test('published Delivery endpoint returns JSON', async ({
    request,
  }) => {
    test.skip(
      !pageId,
      'Set E2E_PAGE_ID to verify the Delivery endpoint.',
    );

    const response = await request.get(
      `${apiBaseUrl}/v1/content/${pageId}`,
    );

    expect(response.ok()).toBeTruthy();

    expect(
      response.headers()['content-type'],
    ).toContain('application/json');

    const body = (await response.json()) as Record<
      string,
      unknown
    >;

    expect(body).toBeTruthy();
    expect(body).not.toHaveProperty('draftData');
    expect(body).not.toHaveProperty('publishedData');
    expect(body).not.toHaveProperty('_id');
  });
});
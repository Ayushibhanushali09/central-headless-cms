import { join } from 'node:path';

import { workspaceRoot } from '@nx/devkit';
import { nxE2EPreset } from '@nx/playwright/preset';
import {
  defineConfig,
  devices,
} from '@playwright/test';

const baseURL =
  process.env['E2E_BASE_URL'] ??
  process.env['BASE_URL'] ??
  'http://localhost:3000';

const apiBaseURL =
  process.env['E2E_API_URL'] ??
  'http://localhost:4000';

const projectRoot = join(
  workspaceRoot,
  'apps',
  'admin-e2e',
);

const isCI = Boolean(process.env['CI']);

export default defineConfig({
  ...nxE2EPreset(projectRoot, {
    testDir: './src',
  }),

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  webServer: [
    {
      command: 'pnpm dev:api',
      url: `${apiBaseURL}/api/v1/health`,
      reuseExistingServer: !isCI,
      cwd: workspaceRoot,
      timeout: 120_000,
    },
    {
      command: 'pnpm dev:admin',
      url: baseURL,
      reuseExistingServer: !isCI,
      cwd: workspaceRoot,
      timeout: 120_000,
    },
  ],

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
      },
    },
  ],
});
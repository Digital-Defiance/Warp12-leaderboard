import path from 'node:path';

import { defineConfig, devices } from '@playwright/test';

const workspaceRoot = path.join(import.meta.dirname, '..');
const baseURL = process.env['BASE_URL'] || 'http://localhost:4310';

export default defineConfig({
  testDir: './e2e',
  outputDir: path.join(workspaceRoot, 'dist/.playwright/leaderboard-e2e/test-output'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    [
      'html',
      {
        outputFolder: path.join(
          workspaceRoot,
          'dist/.playwright/leaderboard-e2e/playwright-report'
        ),
        open: 'on-failure',
      },
    ],
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'yarn preview:leaderboard',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    cwd: workspaceRoot,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

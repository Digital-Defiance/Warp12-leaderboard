import path from 'node:path';

import { defineConfig, devices } from '@playwright/test';

const packageRoot = import.meta.dirname;
const baseURL = process.env['BASE_URL'] || 'http://localhost:4310';

export default defineConfig({
  testDir: './e2e',
  outputDir: path.join(packageRoot, 'dist/.playwright/test-output'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    [
      'html',
      {
        outputFolder: path.join(packageRoot, 'dist/.playwright/playwright-report'),
        open: 'on-failure',
      },
    ],
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'yarn preview',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    cwd: packageRoot,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

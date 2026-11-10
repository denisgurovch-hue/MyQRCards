import { defineConfig, devices } from '@playwright/test';

const webPort = process.env.WEB_PORT ?? '3000';
const apiPort = process.env.API_PORT ?? '3001';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm run start -w @myqrcards/api',
      url: `http://127.0.0.1:${apiPort}/api/v1/healthz`,
      reuseExistingServer: !process.env.CI,
      cwd: '../..',
      env: {
        ...process.env,
        API_PORT: apiPort,
        NODE_ENV: 'test',
      },
    },
    {
      command: 'npm run start -w @myqrcards/web',
      url: `http://127.0.0.1:${webPort}`,
      reuseExistingServer: !process.env.CI,
      cwd: '../..',
      env: {
        ...process.env,
        WEB_PORT: webPort,
        API_URL: `http://127.0.0.1:${apiPort}`,
        NODE_ENV: 'test',
      },
    },
  ],
});

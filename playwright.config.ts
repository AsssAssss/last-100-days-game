import { defineConfig, devices } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5174';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      // 用占位 key 让前端不报错；E2E 通过 route interception 拦下真实请求
      VITE_ANTHROPIC_API_KEY: 'sk-ant-test-placeholder',
    },
  },
});

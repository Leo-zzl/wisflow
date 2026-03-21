import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 测试配置 for Tauri
 * @see https://playwright.dev/docs/intro
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
    // Tauri 应用需要较长的超时
    actionTimeout: 10000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Vite 本地开发服务器配置（端口 1420，与 vite.config.ts 一致）
  webServer: {
    command: 'npm run dev:vite',
    url: 'http://localhost:1420',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

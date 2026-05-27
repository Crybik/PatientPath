import { defineConfig, devices } from '@playwright/test'

const runtimeReady = Boolean(process.env.DATABASE_URL && process.env.SESSION_SECRET)

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: runtimeReady
    ? {
        command: 'npm run dev',
        url: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000',
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
})

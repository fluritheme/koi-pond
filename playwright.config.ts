import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  timeout: 45000,
  expect: { timeout: 10000 },
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  use: {
    baseURL: "http://127.0.0.1:5331",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile", use: { ...devices["iPhone 13"] } },
  ],
  webServer: {
    command: "pnpm dev --strictPort",
    url: "http://127.0.0.1:5331",
    reuseExistingServer: !process.env.CI,
  },
});

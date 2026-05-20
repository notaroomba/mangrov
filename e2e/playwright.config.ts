import { defineConfig, devices } from "@playwright/test";

const WEB_URL = process.env.E2E_WEB_URL ?? "http://localhost:5173";
const API_URL = process.env.E2E_API_URL ?? "http://localhost:8080";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: WEB_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: 15_000,
    extraHTTPHeaders: { "x-e2e": "1" },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.E2E_SKIP_WEBSERVER
    ? undefined
    : [
        {
          command: "npm --workspace server run dev",
          url: `${API_URL}/health`,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          cwd: "..",
          env: {
            NODE_ENV: "test",
            DATABASE_URL:
              process.env.DATABASE_URL ??
              "postgres://mangrov:mangrov@localhost:5432/mangrov",
            BETTER_AUTH_SECRET: "e2e_secret_change_me_e2e_secret_change_me",
            BETTER_AUTH_URL: API_URL,
            TRUSTED_ORIGINS: WEB_URL,
          },
        },
        {
          command: "npm --workspace web run dev",
          url: WEB_URL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          cwd: "..",
          env: {
            VITE_API_URL: API_URL,
            VITE_SOCKET_URL: API_URL,
          },
        },
      ],
});

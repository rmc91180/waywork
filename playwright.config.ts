import { defineConfig, devices } from "@playwright/test";

const playwrightPort = process.env.PLAYWRIGHT_PORT || "4173";
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${playwrightPort}`;
const useExternalServer = Boolean(process.env.PLAYWRIGHT_BASE_URL);

export default defineConfig({
  testDir: "./tests",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: process.env.CI ? 2 : 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
      webServer: useExternalServer
    ? undefined
    : {
        command: `npm run start -- -p ${playwrightPort}`,
        url: baseURL,
        // Always use a fresh server instance to prevent stale-process flakiness.
        reuseExistingServer: false,
        timeout: 120_000,
        env: {
          ...process.env,
          AUTH_URL: baseURL,
          NEXT_PUBLIC_APP_URL: baseURL,
          AUTH_TRUST_HOST: "true",
        },
      },
});

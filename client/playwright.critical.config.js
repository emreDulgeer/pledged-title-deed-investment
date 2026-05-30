/* global process */
import { defineConfig } from "@playwright/test";

const reuseExistingServer = process.env.PW_REUSE_SERVERS === "1";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/critical.smoke.spec.js",
  timeout: 60_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { open: "never" }],
    ["junit", { outputFile: "test-results/critical-junit.xml" }],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:4173",
    locale: "en-US",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run start:qa",
      cwd: "../server",
      port: 5001,
      reuseExistingServer,
      timeout: 120_000,
    },
    {
      command: "npm run dev -- --host localhost --port 4173 --strictPort",
      env: {
        ...process.env,
        VITE_API_URL: "http://localhost:5001/api/v1",
      },
      port: 4173,
      reuseExistingServer,
      timeout: 60_000,
    },
  ],
});

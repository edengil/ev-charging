import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT || 8787);
const BASE = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 45000,
  expect: { timeout: 10000 },
  use: {
    baseURL: BASE,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    locale: "he-IL",
    viewport: { width: 420, height: 900 }
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node scripts/e2e-server.mjs",
    cwd: "..",
    url: BASE,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      E2E_MOCK: "1",
      E2E_PORT: String(PORT)
    },
    timeout: 30000
  }
});

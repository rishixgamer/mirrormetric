import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const macChrome =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const localChrome = existsSync(macChrome)
  ? { launchOptions: { executablePath: macChrome } }
  : {};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], ...localChrome },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"], ...localChrome },
    },
    { name: "desktop-firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "desktop-webkit", use: { ...devices["Desktop Safari"] } },
    { name: "ios-webkit", use: { ...devices["iPhone 15"] } },
  ],
  webServer: {
    command:
      "VITE_E2E=true pnpm build && pnpm exec vite preview --host 127.0.0.1",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

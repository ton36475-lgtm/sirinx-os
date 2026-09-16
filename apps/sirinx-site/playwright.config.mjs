import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.SIRINX_SITE_TEST_PORT || 18730);

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure"
  },
  webServer: {
    command: `SIRINX_SITE_DIR=dist SIRINX_SITE_PORT=${port} node server.mjs`,
    url: `http://127.0.0.1:${port}`,
    timeout: 30_000,
    reuseExistingServer: !process.env.CI
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] }
    }
  ]
});

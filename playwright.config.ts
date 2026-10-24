import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  outputDir: "../../work/qa/artifacts",
  reporter: [["list"], ["json", { outputFile: "../../work/qa/results.json" }]],
  webServer: {
    command: "node scripts/start-qa.mjs",
    url: "http://127.0.0.1:4102/health/ready",
    timeout: 90000,
    reuseExistingServer: false,
  },
  use: {
    baseURL: "http://localhost:8081",
    launchOptions: { channel: "msedge" },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "phone-web", use: { viewport: { width: 390, height: 844 } } },
    { name: "desktop-web", use: { viewport: { width: 1440, height: 900 } } },
  ],
});

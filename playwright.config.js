// End-to-end tests for the admin dashboard AND the public booking site, run
// against the local API stack (see BB-Booking-sys/dev/run_local.sh + seed.py).
//
//   API_BASE=http://127.0.0.1:8000 npx playwright test
//
import { defineConfig, devices } from "@playwright/test";

const API = process.env.API_BASE || "http://127.0.0.1:8000";
const ZEN_DIR = process.env.ZEN_DIR || "../blackbird-zen-web";
// Front-end dev servers used by the specs (override when the demo stack occupies 3000/8080).
const ADMIN_PORT = process.env.ADMIN_PORT || "3000";
const SITE_PORT = process.env.SITE_PORT || "8080";
const ADMIN_URL = `http://127.0.0.1:${ADMIN_PORT}`;
const SITE_URL = `http://127.0.0.1:${SITE_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.js",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e/report" }]],
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
    timezoneId: "Africa/Johannesburg",
    // Watch it live:  PW_CHANNEL=chrome PW_SLOWMO=400 npx playwright test --headed
    channel: process.env.PW_CHANNEL || undefined,
    launchOptions: { slowMo: Number(process.env.PW_SLOWMO || 0) },
  },
  projects: [
    { name: "admin", testMatch: /admin\.spec\.js/, use: { baseURL: ADMIN_URL } },
    { name: "public", testMatch: /public\.spec\.js/, use: { baseURL: SITE_URL } },
    { name: "manage", testMatch: /manage\.spec\.js/, use: { baseURL: SITE_URL } },
    { name: "clients-photos", testMatch: /clients-photos\.spec\.js/, use: { baseURL: ADMIN_URL } },
  ],
  webServer: [
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${ADMIN_PORT}`,
      url: ADMIN_URL,
      reuseExistingServer: true,
      env: { VITE_API_TARGET: API },
      timeout: 60_000,
    },
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${SITE_PORT}`,
      cwd: ZEN_DIR,
      url: SITE_URL,
      reuseExistingServer: true,
      env: { VITE_API_BASE_URL: API },
      timeout: 60_000,
    },
  ],
});

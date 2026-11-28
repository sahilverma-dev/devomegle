import { defineConfig, devices } from "@playwright/test";

/**
 * The dev server port is configurable so a test run can stay off a port that
 * another local project already holds.
 */
const PORT = Number(process.env.E2E_PORT ?? 3000);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        permissions: ["camera", "microphone"],
        launchOptions: {
          args: [
            "--use-fake-ui-for-media-stream",
            "--use-fake-device-for-media-stream",
            "--autoplay-policy=no-user-gesture-required",
          ],
        },
      },
    },
  ],
  webServer: {
    command: `bun run dev --host 127.0.0.1 --port ${PORT}`,
    cwd: "./client",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // Pin every Firebase value to the emulator project so a developer's real
      // client/.env can never leak into the test run.
      VITE_USE_EMULATOR: "true",
      VITE_API_KEY: "demo-api-key",
      VITE_AUTH_DOMAIN: "demo-devomegle.firebaseapp.com",
      VITE_PROJECT_ID: "demo-devomegle",
      VITE_STORAGE_BUCKET: "demo-devomegle.appspot.com",
      VITE_MESSAGING_SENDER_ID: "1234567890",
      VITE_APP_ID: "1:1234567890:web:devomegle",
    },
  },
});

import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  timeout: 30000,
  retries: 1,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: 'npx vite --port 5173 --config tests/e2e/vite.config.e2e.ts',
    port: 5173,
    reuseExistingServer: true,
  },
})

import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for the accessibility e2e suite (e2e/).
 *
 * Every spec runs across four viewport projects — 320×568 (small phone),
 * 768×1024 (tablet), 1280×800 (laptop), 3840×2160 (4K) — because
 * accessibility failures are frequently viewport-specific. Narrow widths are
 * where overlap, clipping and contrast changes from wrapped controls show up,
 * and large viewports surface spacing and focus-indicator problems that a
 * single mid-size scan never sees. (axe has no reflow rule of its own — the
 * value here is running every other rule against each layout.)
 *
 * The webServer serves the repository root (e2e/serve.mjs) so demo pages
 * resolve their real relative paths (../build, ../media). `npm run build`
 * must have produced build/ before the suite runs — CI does this; locally
 * run `npm run build` once first.
 */
const PORT = Number(process.env.A11Y_PORT ?? 8901);

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },

  projects: [
    { name: "mobile-320", use: { ...devices["Desktop Chrome"], viewport: { width: 320, height: 568 } } },
    { name: "tablet-768", use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } } },
    { name: "laptop-1280", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "uhd-3840", use: { ...devices["Desktop Chrome"], viewport: { width: 3840, height: 2160 } } },
  ],

  webServer: {
    command: "node e2e/serve.mjs",
    url: `http://localhost:${PORT}/demos/`,
    reuseExistingServer: !process.env.CI,
    timeout: 30 * 1000,
    env: { A11Y_PORT: String(PORT) },
  },
});

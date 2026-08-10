// jest-puppeteer.config.js
// Headless by default so `npm test` runs unattended (locally and in CI).
// Set HEADFUL=1 to watch the browser while debugging.
module.exports = {
  launch: {
    // Compared explicitly: HEADFUL=0 is a truthy string, and it should mean
    // "stay headless" rather than launching a visible browser.
    headless: !["1", "true"].includes(process.env.HEADFUL),
    // Chromium's sandbox is unavailable in most CI containers.
    args: process.env.CI ? ["--no-sandbox", "--disable-setuid-sandbox"] : [],
  },
};

// jest-puppeteer.config.js
// Headless by default so `npm test` runs unattended (locally and in CI).
// Set HEADFUL=1 to watch the browser while debugging.
module.exports = {
  launch: {
    headless: process.env.HEADFUL ? false : true,
    // Chromium's sandbox is unavailable in most CI containers.
    args: process.env.CI ? ["--no-sandbox", "--disable-setuid-sandbox"] : [],
  },
};

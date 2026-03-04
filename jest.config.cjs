module.exports = {
  projects: [
    {
      displayName: "jsdom",
      testEnvironment: "jest-environment-jsdom",
      testMatch: ["**/__tests__/**/*.test.js"],
      testPathIgnorePatterns: ["/node_modules/", "/__tests__/validate.test.js"],
    },
    {
      displayName: "puppeteer",
      preset: "jest-puppeteer",
      testMatch: ["**/__tests__/validate.test.js"],
    },
  ],
};

module.exports = {
  projects: [
    {
      displayName: "jsdom",
      testEnvironment: "jest-environment-jsdom",
      testMatch: ["**/__tests__/**/*.test.cjs"],
      testPathIgnorePatterns: ["/node_modules/", "/__tests__/validate.test.cjs"],
    },
    {
      displayName: "puppeteer",
      preset: "jest-puppeteer",
      testMatch: ["**/__tests__/validate.test.cjs"],
    },
  ],
};

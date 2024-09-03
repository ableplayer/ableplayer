// validate.test.js

// Include path module
const path = require("path");

// Test cases
describe("validate.js tests", () => {
  beforeAll(async () => {
    await page.goto("http://localhost:8888"); // Replace with your test URL
    const validatePath = path.resolve(__dirname, "../validate.js");
    await page.addScriptTag({ path: validatePath });
  });

  test("processAndPreprocessTags should preprocess and process tags correctly", async () => {
    const testCases = [
      {
        input: "<v My Name>Some text</v>",
        expectedOutput: '<v title="My Name">Some text</v>',
      },
      {
        input: "<v Name>More text</v>",
        expectedOutput: '<v title="Name">More text</v>',
      },
    ];

    for (const { input, expectedOutput } of testCases) {
      const result = await page.evaluate((input) => {
        return validate.processAndPreprocessTags(input);
      }, input);
      expect(result).toBe(expectedOutput);
    }
  });

  test("postprocessCTag should postprocess <c> tags correctly", async () => {
    const input = '<c class="first second">Some text</c>';
    const expectedOutput = "<c.first.second>Some text</c>";
    const result = await page.evaluate((input) => {
      return validate.postprocessCTag(input);
    }, input);
    expect(result).toBe(expectedOutput);
  });

  test("postprocessVTag should postprocess <v> tags correctly", async () => {
    const input = '<v class="first second">Some text</v>';
    const expectedOutput = "<v.first.second>Some text</v>";
    const result = await page.evaluate((input) => {
      return validate.postprocessVTag(input);
    }, input);
    expect(result).toBe(expectedOutput);
  });

  test("postprocessLangTag should postprocess <lang> tags correctly", async () => {
    const input = '<lang lang="en">Some text</lang>';
    const expectedOutput = "<lang en>Some text</lang>";
    const result = await page.evaluate((input) => {
      return validate.postprocessLangTag(input);
    }, input);
    expect(result).toBe(expectedOutput);
  });
});

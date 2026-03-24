// validate.test.js

// Include path module
const path = require("path");

/**
 * Test cases for validate.js
 */
describe("validate.js tests", () => {
  beforeAll(async () => {
    await page.goto("http://localhost:8888"); // Replace with your test URL
    const validatePath = path.resolve(__dirname, "../../build/test/validate.umd.js");
    // Add DOMPurify script
    const domPurifyPath = path.resolve(
      __dirname,
      "../../node_modules/dompurify/dist/purify.min.js"
    );
    await page.addScriptTag({ path: domPurifyPath });
    await page.addScriptTag({ path: validatePath });
  });

  /**
   * Test cases for preSanitizeSetup function
   */
  describe("preProcessVttContent", () => {
    const testCases = [
      {
        input: "<v My Name>Some text</v>",
        expectedOutput: '<v title="My Name">Some text</v>',
      },
      {
        input: "<v Name>More text</v>",
        expectedOutput: '<v title="Name">More text</v>',
      },
      {
        input: '<v title="Name">More text</v>',
        expectedOutput: '<v title="Name">More text</v>',
      },
      {
        input: "<v.blue.green Name>More text</v>",
        expectedOutput: '<v title="Name" class="blue green">More text</v>',
      },
    ];

    testCases.forEach(({ input, expectedOutput }) => {
      test(`should transform ${input} correctly`, async () => {
        const result = await page.evaluate((input) => {
          return window.validate.preProcessVttContent(input);
        }, input);
        expect(result).toBe(expectedOutput);
      });
    });
  });

  /**
   * Test cases for postProcessVttContent function
   */
  describe("postProcessVttContent", () => {
    const testCases = [
      {
        description: "should postprocess <c> tags correctly",
        input: '<c class="first second">Some text</c>',
        expectedOutput: "<c.first.second>Some text</c>",
      },
      {
        description: "should postprocess <v> tags correctly",
        input: '<v class="first second">Some text</v>',
        expectedOutput: "<v.first.second>Some text</v>",
      },
      {
        description: "should postprocess <v> tags correctly, multiple attributes",
        input: '<v class="first second" title="Hello">Some text</v>',
        expectedOutput: '<v.first.second title="Hello">Some text</v>',
      },
            {
        description: "should postprocess <v> tags correctly, different attribute order",
        input: '<v title="Hello" class="first second">Some text</v>',
        expectedOutput: '<v.first.second title="Hello">Some text</v>',
      },
      {
        description: "should postprocess <lang> tags correctly",
        input: '<lang lang="en">Some text</lang>',
        expectedOutput: "<lang en>Some text</lang>",
      },
    ];

    testCases.forEach(({ description, input, expectedOutput }) => {
      test(description, async () => {
        const result = await page.evaluate((input) => {
          return window.validate.postProcessVttContent(input, input);
        }, input);
        expect(result).toBe(expectedOutput);
      });
    });
  });
});

/**
 * Test cases for sanitizeVttContent function
 */
describe("sanitizeVttContent", () => {
  const testCases = [
    {
      description: "should remove disallowed tags",
      input: '<script>alert("XSS")</script><v>Alicia Wood</v>',
      expectedOutput: "<v>Alicia Wood</v>",
    },
    {
      description: "should keep allowed attributes",
      input: '<v.blue.green title="Name">More text</v>',
      expectedOutput: '<v.blue.green title="Name">More text</v>',
    },
    {
      description: "should remove disallowed attributes",
      input: "<v.blue.green onclick=\"alert('XSS')\">More text</v>",
      expectedOutput: "<v.blue.green>More text</v>",
    },
    {
      description: "should remove disallowed attributes",
      input:
        '<v.blue.green>More text</v><img src="x" onerror="alert(\'XSS\');">',
      expectedOutput: "<v.blue.green>More text</v>",
    },
    {
      description: "should remove disallowed attributes",
      input:
        "<v.blue.green onclick=\"alert('XSS')\">More text</v><a href=\"javascript:alert('XSS')\">Click me</a>",
      expectedOutput: "<v.blue.green>More text</v>Click me",
    },
    {
      description: "should handle empty input",
      input: "",
      expectedOutput: "",
    },
    {
      description: "should handle null input",
      input: null,
      expectedOutput: "",
    },
    {
      description: "should handle special characters",
      input: '<v class="test">Hello &amp; welcome</v>',
      expectedOutput: "<v.test>Hello &amp; welcome</v>",
    },
    {
      description: "should handle nested tags correctly",
      input: "<v><b>Bold</b> and <i>italic</i></v>",
      expectedOutput: "<v><b>Bold</b> and <i>italic</i></v>",
    },
  ];

  testCases.forEach(({ description, input, expectedOutput }) => {
    test(description, async () => {
      const result = await page.evaluate((input) => {
        return window.validate.sanitizeVttContent(input);
      }, input);
      expect(result).toBe(expectedOutput);
    });
  });

  test("should handle large input with vulnerability", async () => {
    const largeInput =
      "<v>text</v>".repeat(5000) +
      '<script>alert("XSS")</script>' +
      "<v>text</v>".repeat(5000);
    const result = await page.evaluate((input) => {
      return window.validate.sanitizeVttContent(input);
    }, largeInput);

    // Detailed assertions and logging
    console.log("Result length:", result.length);
    console.log(
      "Expected length:",
      largeInput.length - '<script>alert("XSS")</script>'.length
    );
    console.log("Result starts with:", result.slice(0, 30));
    console.log("Expected starts with:", "<v>text</v>".repeat(3));
    console.log("Result ends with:", result.slice(-30));
    console.log("Expected ends with:", "<v>text</v>".repeat(3));

    // debugger; // Pause execution here to inspect the logs

    expect(result.length).toBe(
      largeInput.length - '<script>alert("XSS")</script>'.length
    );
    expect(result.startsWith("<v>text</v>".repeat(3))).toBe(true);
    expect(result.endsWith("<v>text</v>".repeat(3))).toBe(true);
    expect(result.includes("text")).toBe(true);
    expect(result.includes('<script>alert("XSS")</script>')).toBe(false); // Ensure the script tag is removed
  });

  test("should handle random input", async () => {
    const randomInput = Math.random().toString(36).substring(2);
    const result = await page.evaluate((input) => {
      return window.validate.sanitizeVttContent(input);
    }, randomInput);
    expect(result).toBe(randomInput);
  });
});
/**
 * Test cases for isProtocolSafe function
 */
describe("isProtocolSafe", () => {
  // Define test cases inside the describe block
  const testCases = [
    {
      description: "returns true for valid HTTP URL",
      url: "http://example.com",
      expected: true,
    },
    {
      description: "returns true for valid HTTPS URL",
      url: "https://example.com",
      expected: true,
    },
    {
      description: "returns true for omitted protocol URL",
      url: "//example.com",
      expected: true,
    },
    {
      description: "returns true for relative URL",
      url: "/path/to/resource",
      expected: true,
    },
    {
      description: "returns false for javascript protocol",
      url: "javascript:alert(1)",
      expected: false,
    },
    {
      description: "returns false for data protocol",
      url: "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
      expected: false,
    },
  ];

  // Iterate through each test case
  testCases.forEach(({ description, url, expected }) => {
    test(description, async () => {
      const result = await page.evaluate((url) => {
        return window.validate.isProtocolSafe(url);
      }, url);
      // Pass the `url` variable into the browser context
      expect(result).toBe(expected);
    });
  });
});

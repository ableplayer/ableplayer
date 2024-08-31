// validate.test.js

// Include validate.js
var validate = require("../validate.js");

// Test cases
test("processAndPreprocessTags should preprocess and process tags correctly", function () {
  var input = "<v My Name>Some text</v>";
  var expectedOutput = '<v title="My Name">Some text</v>';
  expect(validate.processAndPreprocessTags(input)).toBe(expectedOutput);
});

test("postprocessCTag should postprocess <c> tags correctly", function () {
  var input = '<c class="first second">Some text</c>';
  var expectedOutput = "<c.first.second>Some text</c>";
  expect(validate.postprocessCTag(input)).toBe(expectedOutput);
});

test("postprocessVTag should postprocess <v> tags correctly", function () {
  var input = '<v class="first second">Some text</v>';
  var expectedOutput = "<v.first.second>Some text</v>";
  expect(validate.postprocessVTag(input)).toBe(expectedOutput);
});

test("postprocessLangTag should postprocess <lang> tags correctly", function () {
  var input = '<lang lang="en">Some text</lang>';
  var expectedOutput = "<lang en>Some text</lang>";
  expect(validate.postprocessLangTag(input)).toBe(expectedOutput);
});

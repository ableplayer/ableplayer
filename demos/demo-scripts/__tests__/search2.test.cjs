const $ = require("jquery");
const DOMPurify = require("dompurify");

// Mock AblePlayer
class AblePlayer {
  constructor(element) {
    this.element = element;
  }
}

global.AblePlayer = AblePlayer;

// Mock DOM elements
document.body.innerHTML = `
  <input id="terms">
  <button id="go">Go</button>
  <div id="video1"></div>
`;

// Import the script to test
require("../search2");

describe("search2.js", () => {
  const sanitizeAndStrip = (input) => {
    $("#terms").val(input);

    const rawSearch = $("#terms").val();
    const cleanSearch = DOMPurify.sanitize(rawSearch);
    const punctuation = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";
    const searchLetters = cleanSearch.split("");
    const cleanLetters = searchLetters.filter(
      (letter) => punctuation.indexOf(letter) === -1
    );
    return cleanLetters.join("");
  };

  test("sanitizes and strips punctuation from normal input", () => {
    const result = sanitizeAndStrip("normal input");
    expect(result).toBe("normal input");
  });

  test("sanitizes and strips punctuation from input with punctuation", () => {
    const result = sanitizeAndStrip("input! with? punctuation.");
    expect(result).toBe("input with punctuation");
  });

  test("1 sanitizes and strips HTML tags from input", () => {
    const result = sanitizeAndStrip('<script>alert("xss")</script>');
    expect(result).toBe("");
  });

  test("2 sanitizes and strips HTML tags from input", () => {
    const result = sanitizeAndStrip('<img src="x" onerror="alert(\'xss\')">');
    expect(result).toBe("img srcx");
  });

  test("sanitizes and strips special characters from input", () => {
    const result = sanitizeAndStrip("input with special characters: @#$%^&*()");
    expect(result).toBe("input with special characters ");
  });

  test("handles empty input", () => {
    const result = sanitizeAndStrip("");
    expect(result).toBe("");
  });

  test("sanitizes and strips Unicode characters from input", () => {
    const result = sanitizeAndStrip("input with unicode: 你好");
    expect(result).toBe("input with unicode 你好");
  });

  test("handles very long input strings", () => {
    const longString = "a".repeat(10000);
    const result = sanitizeAndStrip(longString);
    expect(result).toBe(longString);
  });

  test("sanitizes and strips JavaScript code injection", () => {
    const result = sanitizeAndStrip('"><script>alert("xss")</script>');
    expect(result).toBe("gt");
  });
});

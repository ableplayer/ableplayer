/**
 * @file validate.js
 * @description This file contains the code to validate the VTT data.
 */

/** PRE-SANITIZED FUNCTIONS
 * Some of the VTT attributes need to be transformed before being sanitized by DOMPurify.
 * @namespace preProcessing
 */
var preProcessing = {
  /**
   * Transforms tags with class names separated by dots into tags with a class attribute containing space-separated class names.
   * @memberof preProcessing
   * @param {string} vttContent - The content of the VTT.
   * @returns {string} - The VTT content with processed tags.
   */
  transformCSSClasses: function (vttContent) {
    return vttContent.replace(
      /<(v|c|b|i|u|lang|ruby)\.([\w\.]+)([^>]*)>/g,
      function (_, tag, cssClasses, otherAttrs) {
        var classAttr = cssClasses.split(".").join(" ");
        return "<" + tag + ' class="' + classAttr + '"' + otherAttrs + ">";
      }
    );
  },

  /**
   * Transforms <lang> tags by adding a lang attribute with the language code.
   * @memberof preProcessing
   * @param {string} content - The content with processed CSS classes.
   * @returns {string} - The content with <lang> tags transformed.
   */
  transformLangTags: function (content) {
    return content.replace(
      /<lang\s+([\w-]+)([^>]*)>/g,
      function (_, langCode, otherAttrs) {
        return '<lang lang="' + langCode + '"' + otherAttrs + ">";
      }
    );
  },

  /**
   * Transforms <v> tags by adding a title attribute with the concatenated text and retaining other attributes.
   * @memberof preProcessing
   * @param {string} content - The content with processed <lang> tags.
   * @returns {string} - The content with <v> tags transformed.
   */
  transformVTags: function (content) {
    return content.replace(/<v\s+([^>]*?)>/g, function (_, tagAttributes) {
      var classMatch = tagAttributes.match(/class="([^"]*)"/);
      var classAttr = classMatch ? classMatch[0] : "";
      var nonClassAttributes = tagAttributes
        .replace(/class="[^"]*"/, "")
        .trim()
        .split(/\s+/);

      var attributes = [];
      var titleParts = [];

      // Iterate over each token of the tag content
      nonClassAttributes.forEach(function (token) {
        if (token.indexOf("=") !== -1) {
          attributes.push(token);
        } else {
          titleParts.push(token);
        }
      });

      var title = titleParts.join(" ");
      var newTag = "<v";

      if (title) {
        newTag += ' title="' + title + '"';
      }

      if (attributes.length > 0) {
        newTag += " " + attributes.join(" ");
      }

      if (classAttr) {
        newTag += " " + classAttr;
      }

      newTag += ">";
      return newTag;
    });
  },
};

/** POST-SANITIZED FUNCTIONS
 * After sanitizing the VTT data, some tags need to be transformed back to their original form.
 * @namespace postProcessing
 */
var postProcessing = {
  /**
   * Post-processes <c> tags by converting class attributes to dot-separated class names.
   * @memberof postProcessing
   * @param {string} vttContent - The VTT content to be processed.
   * @returns {string} - The VTT content with processed <c> tags.
   */
  postprocessCTag: function (vttContent) {
    return vttContent.replace(
      /<c class="([\w\s]+)">/g,
      function (_, classNames) {
        var classes = classNames.split(" ").join(".");
        return "<c." + classes + ">";
      }
    );
  },

  /**
   * Post-processes <v> tags by converting class attributes to dot-separated class names.
   * @memberof postProcessing
   * @param {string} vttContent - The VTT content to be processed.
   * @returns {string} - The VTT content with processed <v> tags.
   */
  postprocessVTag: function (vttContent) {
    return vttContent.replace(
      /<v class="([\w\s]+)"([^>]*)>/g,
      function (_, classNames, otherAttrs) {
        var classes = classNames.split(" ").join(".");
        return "<v." + classes + otherAttrs + ">";
      }
    );
  },

  /**
   * Post-processes <lang> tags by removing the lang attribute and placing the language code directly in the tag.
   * @memberof postProcessing
   * @param {string} vttContent - The VTT content to be processed.
   * @returns {string} - The VTT content with processed <lang> tags.
   */
  postprocessLangTag: function (vttContent) {
    return vttContent.replace(
      /<lang lang="([\w-]+)"([^>]*)>/g,
      function (_, langCode, otherAttrs) {
        return "<lang " + langCode + otherAttrs + ">";
      }
    );
  },
};

/**
 * Preprocesses, sanitizes and post-processes VTT content.
 * @namespace validate
 */
var validate = {
  /**
   * Sets up the VTT content before sanitizing by transforming tags.
   * This way DOM purify will process the tags correctly.
   * @memberof validate
   * @param {string} vttContent - The original content of the VTT.
   * @returns {string} - The VTT content for the next and final step of preprocessing.
   */
  preProcessVttContent: function (vttContent) {
    var processedCSS = preProcessing.transformCSSClasses(vttContent);
    var processedLang = preProcessing.transformLangTags(processedCSS);
    var processedVTags = preProcessing.transformVTags(processedLang);
    return processedVTags;
  },

  /**
   * Post-processes the sanitized VTT data by converting class attributes to dot-separated class names and other transformations.
   * @memberof validate
   * @param {string} sanitizedVttContent - The sanitized VTT content to be post-processed.
   * @param {string} originalVttContent - The original VTT content before sanitization.
   * @returns {string} - The post-processed VTT content.
   */
  postProcessVttContent: function (sanitizedVttContent, originalVttContent) {
    var processedCTags = postProcessing.postprocessCTag(sanitizedVttContent);
    var processedVTags = postProcessing.postprocessVTag(processedCTags);
    var processedLangTags = postProcessing.postprocessLangTag(processedVTags);

    var arrowReplaced = processedLangTags.replace(/--&gt;/g, "-->");

    var finalContent = arrowReplaced.replace(
      /<\/v>/g,
      function (match, offset) {
        return originalVttContent.indexOf(match, offset) !== -1 ? match : "";
      }
    );

    return finalContent;
  },

  /**
   * Sanitizes the VTT data by removing unwanted tags and attributes, and then post-processes it.
   * @memberof validate
   * @param {string} vttContent - The VTT content to be sanitized and post-processed.
   * @returns {string} - The fully processed VTT content.
   */
  sanitizeVttContent: function (vttContent) {
    if (vttContent === null || vttContent === undefined) {
      return "";
    }
    var preSanitizedVttContent = validate.preProcessVttContent(vttContent);

    var config = {
      ALLOWED_TAGS: ["b", "i", "u", "v", "c", "lang", "ruby", "rt", "rp"],
      ALLOWED_ATTR: ["title", "class", "lang"],
      KEEP_CONTENT: true,
    };

    var sanitizedVttContent = DOMPurify.sanitize(
      preSanitizedVttContent,
      config
    );

    return validate.postProcessVttContent(sanitizedVttContent, vttContent);
  },
};

// Export the object for use in other files
if (typeof module !== "undefined" && module.exports) {
  module.exports = validate;
}
// End of validate.js

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('dompurify')) :
  typeof define === 'function' && define.amd ? define(['dompurify'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.validate = factory(global.DOMPurify));
})(this, (function (DOMPurify) { 'use strict';

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
  	// This function should only be passed one cue at a time.
  	// Throw an error if the string checked is more than 1000 characters.
  	if ( vttContent.length > 1000 ) {
  		throw new Error( "Input too long" );
  	}
      return vttContent.replace(
        /<(v|c|b|i|u|lang|ruby)\.([\w.]+)([^>]*)>/g,
        function (_, tag, cssClasses, otherAttrs) {
          var classAttr = cssClasses.replace(/\./g, " ");
          return `<${tag} class="${classAttr}"${otherAttrs}>`;
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
     * Transforms <v> tags by extracting any non-attribute text as a `title` attribute,
     * retains existing attributes (except class), and preserves the class attribute if present.
     * Example: <v John class="foo" data-x="y"> becomes <v title="John" data-x="y" class="foo">
     *
     * @function
     * @memberof preProcessing
     * @param {string} content - The string content containing <v> tags to process.
     * @returns {string} The content with <v> tags transformed to include a title attribute and preserved attributes.
     */
    transformVTags: function (content) {
  	return content.replace(/<v\s+([^>]*?)>/g, function (_, tagAttributes) {
  		var classMatch = tagAttributes.match(/class="([^"]*)"/);
  		var titleMatch = tagAttributes.match(/title="([^"]*)"/);
  		var classAttr = classMatch ? classMatch[0] : "";
  		var titleAttr = titleMatch ? titleMatch[0] : "";
  		var otherAttributes = tagAttributes
  			.replace(/class="[^"]*"/, "")
  			.replace(/title="[^"]*"/, "")
  			.trim()
  			.split(/\s+/);

  		var attributes = [];
  		var titleParts = [];

  		// Iterate over each token of the tag content
  		otherAttributes.forEach(function (token) {
  			if (token.indexOf("=") !== -1) {
  			attributes.push(token);
  			} else {
  			titleParts.push(token);
  			}
  		});

  		var title = ( titleParts ) ? titleParts.join(" ") : false;
  		var newTag = "<v";

  		if ( title && ! titleAttr ) {
  			newTag += ' title="' + title + '"';
  		}

  		if ( titleAttr && ! title ) {
  			newTag += " " + titleAttr;
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
          var classes = classNames.replace(/ /g, ".");
          return "<c." + classes + ">";
        }
      );
    },

    /**
     * * Post-processes <v> tags by converting class attributes, no matter where found in the attribute order, to dot-separated class names.
     * For example, <v class="foo bar" title="John"> becomes <v.foo.bar title="John">.
     * Removes the class attribute and appends other attributes after the class names.
     *
     * @function
     * @memberof postProcessing
     * @param {string} vttContent - The VTT content to be processed.
     * @returns {string} - The VTT content with processed <v> tags.
     */
    postprocessVTag: function (vttContent) {
      return vttContent.replace(
        /<v([^>]*)class="([\w\s]+)"([^>]*)>/g,
        function (_, beforeClass, classNames, afterClass) {
          var classes = classNames.trim().split(/\s+/).join(".");
          // Rebuild the tag: <v.{classes}{other attributes}>
          // Remove class="..." from attributes
          var attrs = (beforeClass + afterClass)
            .replace(/\s*class="[\w\s]+"/, "")
            .trim();
          return "<v." + classes + (attrs ? " " + attrs : "") + ">";
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
   * Preprocesses, sanitizes and post-processes VTT content as well as other utility functions.
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
      var timestampTagReplaced = arrowReplaced.replace(/&lt;([\d:.]+)&gt;/g, '<$1>');

      var finalContent = timestampTagReplaced.replace(
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
    // Utility validation functions
    isProtocolSafe: function (url) {
      //creates a new URL object for analysis to check if the protocol is http or https
      //returns true if there is a match false otherwise
      try {
        const parsedUrl = new URL(url, window.location.origin); // Resolve relative URLs
        return ["http:", "https:"].includes(parsedUrl.protocol); // Allow only HTTP and HTTPS
      } catch (e) {
        return false; // Invalid URL
      }
    },
  };

  return validate;

}));

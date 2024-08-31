var validate = {
  processAndPreprocessTags: function (html) {
    var preprocessedHtml = html.replace(
      /<(v|c|b|i|u|lang|ruby)\.([\w\.]+)([^>]*)>/g,
      function (match, tag, words, otherAttrs) {
        var classAttr = words.split(".").join(" ");
        return "<" + tag + ' class="' + classAttr + '"' + otherAttrs + ">";
      }
    );

    preprocessedHtml = preprocessedHtml.replace(
      /<lang\s+([\w-]+)([^>]*)>/g,
      function (match, langCode, otherAttrs) {
        return '<lang lang="' + langCode + '"' + otherAttrs + ">";
      }
    );

    var processedHtml = preprocessedHtml.replace(
      /<v\s+([^>]*?)>/g,
      function (match, p1) {
        var classMatch = p1.match(/class="([^"]*)"/);
        var classAttr = classMatch ? classMatch[0] : "";
        var p1WithoutClass = p1.replace(/class="[^"]*"/, "").trim();
        var parts = p1WithoutClass.split(/\s+/);
        var attributes = [];
        var titleParts = [];

        parts.forEach(function (part) {
          if (part.indexOf("=") !== -1) {
            attributes.push(part);
          } else {
            titleParts.push(part);
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
      }
    );

    return processedHtml;
  },

  postprocessCTag: function (vttData) {
    return vttData.replace(
      /<c class="([\w\s]+)">/g,
      function (match, classNames) {
        var classes = classNames.split(" ").join(".");
        return "<c." + classes + ">";
      }
    );
  },

  postprocessVTag: function (vttData) {
    return vttData.replace(
      /<v class="([\w\s]+)"([^>]*)>/g,
      function (match, classNames, otherAttrs) {
        var classes = classNames.split(" ").join(".");
        return "<v." + classes + otherAttrs + ">";
      }
    );
  },

  postprocessLangTag: function (vttData) {
    return vttData.replace(
      /<lang lang="([\w-]+)"([^>]*)>/g,
      function (match, langCode, otherAttrs) {
        return "<lang " + langCode + otherAttrs + ">";
      }
    );
  },
};

// Export the object for use in other files
if (typeof module !== "undefined" && module.exports) {
  module.exports = validate;
}

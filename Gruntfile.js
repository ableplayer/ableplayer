module.exports = function (grunt) {
  grunt.loadNpmTasks("grunt-contrib-concat");
  grunt.loadNpmTasks("grunt-contrib-copy");
  grunt.loadNpmTasks("grunt-contrib-cssmin");
  grunt.loadNpmTasks("grunt-contrib-clean");
  grunt.loadNpmTasks("grunt-remove-logging");
  grunt.loadNpmTasks("grunt-contrib-jshint");
  grunt.loadNpmTasks("grunt-terser");

  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),
    concat: {
      build: {
        src: [
          // Ultimately this should be just 'scripts/*.js',
          //  but for now we're maintaining the order which was
          //  specified in the previous 'compile.sh' script
          "node_modules/dompurify/dist/purify.js",
          "scripts/ableplayer-base.js",
          "scripts/initialize.js",
          "scripts/preference.js",
          "scripts/webvtt.js",
          "scripts/buildplayer.js",
          "scripts/validate.js",
          "scripts/track.js",
          "scripts/youtube.js",
          "scripts/slider.js",
          "scripts/volume.js",
          "scripts/dialog.js",
          "scripts/misc.js",
          "scripts/description.js",
          "scripts/browser.js",
          "scripts/control.js",
          "scripts/caption.js",
          "scripts/chapters.js",
          "scripts/metadata.js",
          "scripts/transcript.js",
          "scripts/search.js",
          "scripts/event.js",
          "scripts/dragdrop.js",
          "scripts/sign.js",
          "scripts/langs.js",
          "scripts/translation.js",
          "scripts/ttml2webvtt.js",
          "scripts/JQuery.doWhen.js",
          "scripts/vts.js",
          "scripts/vimeo.js",
        ],
        dest: "build/<%= pkg.name %>.js",
      },
      banner: {
        options: {
          banner: "/*! <%= pkg.name %> V<%= pkg.version %> */\n",
        },
        src: "build/<%= pkg.name %>.min.js",
        dest: "build/<%= pkg.name %>.min.js",
      },
    },
    removelogging: {
      dist: {
        src: ["build/<%= pkg.name %>.js"],
        dest: "build/<%= pkg.name %>.dist.js",
      },
      options: {
        // Remove all console output (see https://www.npmjs.com/package/grunt-remove-logging)
      },
    },
    terser: {
      min: {
        files: {
          "build/<%= pkg.name %>.min.js": ["build/<%= pkg.name %>.dist.js"],
        },
        options: {
          ecma: 2015, // Specify ECMAScript version to support ES6+
          keep_fnames: true,
          output: {
            comments: /^!/,
          },
        },
      },
    },
    cssmin: {
      min: {
        src: ["styles/ableplayer.css"],
        dest: "build/<%= pkg.name %>.min.css",
      },
      options: {
        // Add a banner with the package name and version
        //  (no date, otherwise a new build is different even if the code didn't change!)
        //  (oddly, here we don't need a '\n' at the end!)
        banner: "/*! <%= pkg.name %> V<%= pkg.version %> */",
      },
    },
    jshint: {
      files: ["Gruntfile.js", "scripts/**/*.js"],
      options: {
        // options here to override JSHint defaults
        globals: {
          browser: true,
          jquery: true,
          devel: true,
        },
      },
    },
    clean: {
      build: ["build"],
    },
  });

  grunt.registerTask("default", [
    "concat",
    "removelogging",
    "terser",
    "cssmin",
  ]);
  grunt.registerTask("test", ["jshint"]);
};

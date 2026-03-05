module.exports = function (grunt) {
  grunt.loadNpmTasks("grunt-contrib-concat");
  grunt.loadNpmTasks("grunt-contrib-copy");
  grunt.loadNpmTasks("grunt-contrib-cssmin");
  grunt.loadNpmTasks("grunt-contrib-clean");
  grunt.loadNpmTasks("grunt-remove-logging");
  grunt.loadNpmTasks("grunt-decomment");
  grunt.loadNpmTasks("grunt-contrib-jshint");
  grunt.loadNpmTasks("grunt-terser");
  grunt.loadNpmTasks("grunt-rollup");
  grunt.loadNpmTasks('grunt-run');

  const nodeResolve = require('@rollup/plugin-node-resolve');
  const commonjs = require('@rollup/plugin-commonjs');

  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),
    concat: {
      options: {
        banner: "/*! <%= pkg.name %> V<%= pkg.version %> with DOMPurify included */\n",
        process: function(src, filepath) {
          // Remove the source map reference line only from the dompurify file
          if (filepath.includes('dompurify')) {
            return src.replace(/\/\/# sourceMappingURL=.*\.map/g, '');
          }
          return src;
        }
      },
      build: {
        src: [
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
          "scripts/vts.js",
          "scripts/vimeo.js",
        ],
        dest: "build/<%= pkg.name %>.js",
      },
      build_separate_dompurify: {
        options: {
          banner: "/*! <%= pkg.name %> V<%= pkg.version %> - In this file, DOMPurify is not bundled in with AblePlayer, but is a required dependency that can be added to the project via a local copy or a CDN */\n",
        },
        src: [
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
          "scripts/vts.js",
          "scripts/vimeo.js",
        ],
        dest: "build/separate-dompurify/<%= pkg.name %>.js",
      },
    },
    rollup: {
      options: {
        name: 'AblePlayer',
        format: 'umd',
        sourcemap: true,
        plugins: function () {
          return [
            nodeResolve(),
            commonjs(),
          ]
        }
      },
      full: {
        options: {
          banner: "/*! <%= pkg.name %> V<%= pkg.version %> with DOMPurify included */\n",
          globals: {
            jquery: 'jQuery',
          },
          external: ['jquery']
        },
        files: {
          'build/<%= pkg.name %>.umd.js': ['scripts/main.js'],
        }
      },
      separate_dompurify: {
        options: {
          banner: "/*! <%= pkg.name %> V<%= pkg.version %> - In this file, DOMPurify is not bundled in with AblePlayer, but is a required dependency that can be added to the project via a local copy or a CDN */\n",
          sourcemapFile: 'build/separate-dompurify/<%= pkg.name %>-separate-dompurify.umd.js.map',
          globals: {
            jquery: 'jQuery',
            dompurify: 'DOMPurify',
          },
          external: ['jquery', 'dompurify'],
        },
        files: {
          'build/separate-dompurify/<%= pkg.name %>.umd.js': ['scripts/main.js'],
        }
      },
      test_validate: {
        options: {
          name: 'validate',
          banner: "/*! Only used for testing */\n",
          globals: {
            dompurify: 'DOMPurify',
          },
          external: ['dompurify'],
        },
        files: {
          'build/test/validate.umd.js': ['scripts/validate.js'],
        }
      }
    },
    removelogging: {
      dist: {
        src: ["build/<%= pkg.name %>.js"],
        dest: "build/<%= pkg.name %>.dist.js",
      },
      dist_separate_dompurify: {
        src: ["build/separate-dompurify/<%= pkg.name %>.js"],
        dest: "build/separate-dompurify/<%= pkg.name %>.dist.js",
      },
      options: {
        // Remove all console output (see https://www.npmjs.com/package/grunt-remove-logging)
      },
    },
    decomment: {
      any: {
		options: {
			safe: true,
		},
		files: {
			"build/<%= pkg.name %>.dist.js": "build/<%= pkg.name %>.dist.js",
		},

      }
    },
    terser: {
      options: {
        ecma: 2015,
        keep_fnames: true,
        output: {
          comments: /^!/,
        }
      },
      min: {
        files: {
          "build/<%= pkg.name %>.min.js": ["build/<%= pkg.name %>.dist.js"],
        },
      },
      min_separate_dompurify: {
        files: {
          "build/separate-dompurify/<%= pkg.name %>.min.js": ["build/separate-dompurify/<%= pkg.name %>.dist.js"],
          "build/separate-dompurify/purify.min.js": ["node_modules/dompurify/dist/purify.js"],
        },
      },
      umd: {
        options: {
          compress: {
            'drop_console': ['log']
          }
        },
        files: {
          "build/<%= pkg.name %>.umd.min.js": ["build/<%= pkg.name %>.umd.js"]
        }
      },
      umd_separate_dompurify: {
        options: {
          compress: {
            'drop_console': ['log']
          }
        },
        files: {
          "build/separate-dompurify/<%= pkg.name %>.umd.min.js": ["build/separate-dompurify/<%= pkg.name %>.umd.js"]
        }
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
    run: {
      jest: {
        cmd: 'npm',
        args: ['exec', 'jest', '--', '--colors']
      }
    },
    clean: {
      build: ["build"],
    },
  });

  grunt.registerTask("default", [
    "concat:build",
    "removelogging:dist",
	"decomment",
    "terser:min",
    "cssmin",
  ]);
  grunt.registerTask("build_separate_dompurify", [
    "concat:build_separate_dompurify",
    "removelogging:dist_separate_dompurify",
    "terser:min_separate_dompurify",
  ]);
  grunt.registerTask("test", ["jshint"]);
  grunt.registerTask("jest", ["rollup:test_validate", "run:jest"]);
  grunt.registerTask("umd", [
    "rollup:full",
    "terser:umd",
    "cssmin",
  ]);
  grunt.registerTask("umd_separate_dompurify", [
    "rollup:separate_dompurify",
    "terser:umd_separate_dompurify",
  ]);
};

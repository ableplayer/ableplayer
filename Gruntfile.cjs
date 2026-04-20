module.exports = function (grunt) {
  grunt.loadNpmTasks("grunt-contrib-copy");
  grunt.loadNpmTasks("grunt-contrib-cssmin");
  grunt.loadNpmTasks("grunt-contrib-clean");
  grunt.loadNpmTasks('grunt-run');
  grunt.loadNpmTasks('grunt-eslint');

  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),
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
    run: {
      rollup: {
        cmd: 'node',
        args: ['node_modules/rollup/dist/bin/rollup', '-c'],
      },
      jest: {
        cmd: 'node',
        args: ['node_modules/jest/bin/jest.js', '--colors']
      },
      types: {
        cmd: 'node',
        args: ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json']
      },
    },
    copy: {
      dompurify: {
        files: {
          'build/separate-dompurify/purify.min.js': ['node_modules/dompurify/dist/purify.min.js'],
        }
      }
    },
    eslint: {
      target: ['scripts/*.js'],
    },
    clean: {
      build: ["build"],
    },
  });

  grunt.registerTask("default", [
    "run:rollup",
    "run:types",
    "copy:dompurify",
    "cssmin",
  ]);
  grunt.registerTask("test", ["eslint"]);
  grunt.registerTask("jest", ["run:rollup", "run:jest"]);
};

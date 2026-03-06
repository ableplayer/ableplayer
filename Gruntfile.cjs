module.exports = function (grunt) {
  grunt.loadNpmTasks("grunt-contrib-copy");
  grunt.loadNpmTasks("grunt-contrib-cssmin");
  grunt.loadNpmTasks("grunt-contrib-clean");
  grunt.loadNpmTasks("grunt-terser");
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
        cmd: 'npm',
        args: ['exec', 'rollup', '--', '-c'],
      },
      jest: {
        cmd: 'npm',
        args: ['exec', 'jest', '--', '--colors']
      },
      types: {
        cmd: 'npx',
        args: ['tsc']
      },
    },
    copy: {
      dompurify: {
        files: {
          'build/separate-dompurify/purify.min.js': ['/node_modules/dompurify/dist/purify.min.js'],
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

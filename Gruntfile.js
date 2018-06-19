const webpackConfig = require('./webpack.config');

module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-webpack');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-clean');

    grunt.initConfig({
        webpack: {
            options: {
              stats: !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
            },
            prod: webpackConfig,
            dev: Object.assign({ watch: true, mode: 'development' }, webpackConfig)
        },
        pkg: grunt.file.readJSON('package.json'),
        cssmin: {
            min: {
                src  : [
                    'styles/ableplayer.css',
                ],
                dest : 'build/<%= pkg.name %>.min.css',
            },
            options: {
                // Add a banner with the package name and version
                //  (no date, otherwise a new build is different even if the code didn't change!)
                //  (oddly, here we don't need a '\n' at the end!)
                banner: '/*! <%= pkg.name %> V<%= pkg.version %> */',
            }
        },
        clean: {
          build: ['build'],
        }
    });
    grunt.registerTask('default', ['clean','cssmin', 'webpack']);
};

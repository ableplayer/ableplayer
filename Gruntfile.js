module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks("grunt-remove-logging");
    grunt.loadNpmTasks('grunt-contrib-jshint');

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            build: {
                src: [
                    // Ultimately this should be just 'scripts/*.js',
                    //  but for now we're maintaining the order which was
                    //  specified in the previous 'compile.sh' script
                    'scripts/ableplayer-base.js',
                    'scripts/initialize.js',
                    'scripts/preference.js',
                    'scripts/webvtt.js',
                    'scripts/buildplayer.js',
                    'scripts/track.js',
                    'scripts/seekbar.js',
                    'scripts/dialog.js',
                    'scripts/misc.js',
                    'scripts/description.js',
                    'scripts/browser.js',
                    'scripts/control.js',
                    'scripts/caption.js',
                    'scripts/metadata.js',
                    'scripts/translation.js',
                    'scripts/transcript.js',
                    'scripts/search.js',
                    'scripts/event.js',
                    'scripts/dragdrop.js',
                    'scripts/sign.js'
                ],
                dest: 'build/<%= pkg.name %>.js'
            },
        },
        removelogging: {
            dist: {
                src: [
                    'build/<%= pkg.name %>.js'
                ],
                dest: 'build/<%= pkg.name %>.dist.js'
            },
            options: {
                // Remove all console output (see https://www.npmjs.com/package/grunt-remove-logging)
            }
        },
        uglify: {
            min: {
                src    : ['build/<%= pkg.name %>.dist.js'],
                dest   : 'build/<%= pkg.name %>.min.js',
            },
            options: {
                // Add a banner with the package name and version
                //  (no date, otherwise a new build is different even if the code didn't change!)
                banner: '/*! <%= pkg.name %> V<%= pkg.version %> */\n',
                // Preserve comments that start with a bang (like the file header)
                preserveComments: "some"
            }
        },
        cssmin: {
            min: {
                src  : [
                    'styles/ableplayer.css',
                    'styles/ableplayer-playlist.css',
                    'styles/ableplayer-search.css',
                    'styles/ableplayer-transcript.css'
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
        jshint: {
            files: ['Gruntfile.js', 'scripts/**/*.js'],
            options: {
                // options here to override JSHint defaults
                globals: {
                    browser: true,
                    jquery: true,
                    devel: true,
                }
            }
        },
        clean: {
          build: ['build'],
        },

    });

    grunt.registerTask('default', ['concat', 'removelogging', 'uglify', 'cssmin']);
    grunt.registerTask('test', ['jshint']);
};

import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import strip from '@rollup/plugin-strip';
import pkg from './package.json' with { type: 'json' };
import json from '@rollup/plugin-json';

const getDefaultPlugins = () => {
    return [nodeResolve(), commonjs(), json()];
}

const getTerserWithConfig = () => {
    return terser({
        ecma: 2015,
        keep_fnames: true,
        format: {
            comments: /^!/,
        },
        compress: {
            drop_console: ['log']
        }
    });
};

const getStripWithConfig = () => {
    return strip({
        functions: ['console.log'],
    });
}

const nameVersion = `${pkg.name} V${pkg.version}`;

export default [
    {
        input: 'scripts/main.js',
        plugins: getDefaultPlugins(),
        external: ['jquery'],
        output: [
            {
                name: 'AblePlayer',
                file: 'build/ableplayer.js',
                format: 'umd',
                banner: `/*! ${nameVersion} - with DOMPurify included. Console logs enabled, for development */\n`,
                sourcemap: true,
                globals: {
                    jquery: 'jQuery',
                },
            },
            {
                name: 'AblePlayer',
                file: 'build/ableplayer.min.js',
                format: 'umd',
                banner: `/*! ${nameVersion} - with DOMPurify included. Minified production bundle. */\n`,
                sourcemap: true,
                globals: {
                    jquery: 'jQuery',
                },
                plugins: [getTerserWithConfig()],
            },
        ],
    },
    {
        input: 'scripts/main.js',
        plugins: [...getDefaultPlugins(), getStripWithConfig()],
        external: ['jquery'],
        output: [
            {
                name: 'AblePlayer',
                file: 'build/ableplayer.dist.js',
                format: 'umd',
                banner: `/*! ${nameVersion} - with DOMPurify included. Console logs disabled, but not minified, for demos. */\n`,
                sourcemap: true,
                globals: {
                    jquery: 'jQuery',
                },
            },
        ],
    },
    {
        input: 'scripts/main.js',
        plugins: getDefaultPlugins(),
        external: ['jquery', 'dompurify'],
        output: [
            {
                name: 'AblePlayer',
                file: 'build/separate-dompurify/ableplayer.js',
                format: 'umd',
                banner: `/*! ${nameVersion} - needs DOMPurify provided separately. Console logs enabled, for development */\n`,
                sourcemap: true,
                globals: {
                    jquery: 'jQuery',
                    dompurify: 'DOMPurify',
                },
            },
            {
                name: 'AblePlayer',
                file: 'build/separate-dompurify/ableplayer.min.js',
                format: 'umd',
                banner: `/*! ${nameVersion} - needs DOMPurify provided separately. Minified production bundle. */\n`,
                sourcemap: true,
                globals: {
                    jquery: 'jQuery',
                    dompurify: 'DOMPurify',
                },
                plugins: [getTerserWithConfig()],
            },
        ]
    },
    {
        input: 'scripts/main.js',
        plugins: [...getDefaultPlugins(), getStripWithConfig()],
        external: ['jquery', 'dompurify'],
        output: [
            {
                name: 'AblePlayer',
                file: 'build/separate-dompurify/ableplayer.dist.js',
                format: 'umd',
                banner: `/*! ${nameVersion} - needs DOMPurify provided separately. Console logs disabled, but not minified, for demos. */\n`,
                sourcemap: true,
                globals: {
                    jquery: 'jQuery',
                    dompurify: 'DOMPurify',
                },
            },
        ]
    },
    {
        // We still need to bundle a single ES module, to remove logs
        // If we make the logging situation decide at runtime instead, we could simply expose the entry point directly
        input: 'scripts/main.js',
        plugins: [
            ...getDefaultPlugins(),
            getStripWithConfig(),
        ],
        external: [/node_modules/],
        output: {
            file: pkg.main,
            banner: `/*! ${nameVersion} - ECMAScript module suitable for use in other bundlers. Console logs stripped out. */\n`,
            format: 'esm',
            sourcemap: true,
        }
    },
    {
        // This one is just for jest testing
        input: 'scripts/validate.js',
        plugins: [nodeResolve(), commonjs()],
        external: ['dompurify'],
        output: {
            name: 'validate',
            sourcemap: false,
            file: 'build/test/validate.umd.js',
            format: 'umd',
            globals: {
                dompurify: 'DOMPurify',
            },
        },
    },
]

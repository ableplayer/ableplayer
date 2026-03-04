import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import pkg from './package.json' with { type: 'json' };

export default [
    {
        input: 'scripts/main.js',
        output: {
            name: 'AblePlayer',
            file: pkg.browser,
            format: 'umd',
            sourcemap: true,
            globals: {
                jquery: 'jQuery',
            }
        },
        plugins: [nodeResolve(), commonjs()],
        external: ['jquery']
    },
    {
        input: 'scripts/main.js',
        output: {
            name: 'AblePlayer',
            file: 'build/ableplayer-separate-dompurify.umd.js',
            format: 'umd',
            sourcemap: true,
            globals: {
                jquery: 'jQuery',
                dompurify: 'DOMPurify',
            }
        },
        plugins: [nodeResolve(), commonjs()],
        external: ['jquery', 'dompurify']
    },
]

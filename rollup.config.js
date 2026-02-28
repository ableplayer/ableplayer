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
            sourcemap: 'inline',
        },
        plugins: [nodeResolve(), commonjs()]
    }
]

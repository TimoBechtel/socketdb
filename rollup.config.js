import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import ts from 'rollup-plugin-ts';

export default [
	{
		// minified browser bundle to be included via script tag
		input: 'src/browser/umdWrapper.ts',
		output: {
			format: 'umd',
			name: 'SocketDBClient',
			file: 'browser/socketdb.min.js',
			sourcemap: true,
			exports: 'default',
			esModule: false,
		},
		plugins: [
			resolve({ extensions: ['.js', '.ts'] }),
			commonjs(),
			babel({
				extensions: ['.js', '.ts'],
				babelHelpers: 'runtime',
				exclude: ['node_modules/**'],
				include: ['src/**/*'],
			}),
			,
			terser(),
		],
	},
	{
		// esm browser bundle to be imported as module
		input: 'src/browser/esmWrapper.ts',
		output: {
			format: 'esm',
			name: 'SocketDBClient',
			file: 'browser/index.js',
			sourcemap: true,
			exports: 'named',
		},
		plugins: [
			ts({
				tsconfig: 'tsconfig.browser.json',
			}),
		],
	},
];

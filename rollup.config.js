import externals from 'rollup-plugin-node-externals';
import { fileURLToPath } from 'url';
import path from 'path';
import alias from '@rollup/plugin-alias';
import replace from '@rollup/plugin-replace';
import esbuild from 'rollup-plugin-esbuild';
import styles from 'rollup-plugin-styles';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default [
	{
		input: './bin/abdo.js',
		output: {
			format: 'es',
			file: 'dist/bin/abdo.js',
			banner: '#!/usr/bin/env node',
		},
		plugins: [externals({ include: ['terser', 'browserslist', '@rollup/pluginutils'] })],
	},
	{
		input: './lib/toolbar/pptr-toolbar.jsx',
		output: {
			format: 'iife',
			file: 'dist/lib/pptr-toolbar.js',
		},
		plugins: [
			alias({
				entries: [
					{ find: 'a-b-doer/hooks', replacement: path.join(__dirname, 'hooks') },
					{ find: 'a-b-doer/internal', replacement: path.join(__dirname, 'internal') },
					{ find: 'a-b-doer', replacement: path.join(__dirname, 'main') },
				],
			}),
			replace({
				preventAssignment: true,
				values: {
					'config.hooks': 'true',
					'config.jsx': 'true',
					'process.env.IE': 'false',
					'process.env.NODE_ENV': JSON.stringify('development'),
					'process.env.PREACT': 'false',
					'process.env.TEST_ENV': 'false',
					'process.env.TEST_ID': JSON.stringify('t-pptr-toolbar'),
					'process.env.preact': 'false',
				},
			}),
			esbuild({
				sourceMap: false,
				minify: false,
				jsx: 'automatic',
				jsxImportSource: path.join(__dirname, 'lib', 'toolbar'),
			}),
			styles({
				modules: true,
			}),
		],
	},
];

console.log(path.join(__dirname, 'main'));

import externals from 'rollup-plugin-node-externals';

export default {
	input: 'test.js',
	output: {
		format: 'es',
		file: 'dist/bin/abdo.js',
		banner: '#!/usr/bin/env node',
	},
	plugins: [externals({ deps: true, include: ['terser', 'browserslist', '@rollup/pluginutils'] })],
};

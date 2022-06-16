import alias from '@rollup/plugin-alias';
import autoprefixer from 'autoprefixer';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import path from 'path';
import styles from 'rollup-plugin-styles';
import stringHash from 'string-hash';
import replace from '@rollup/plugin-replace';
import { babel } from '@rollup/plugin-babel';
import { rollup } from 'rollup';
import { terser } from 'rollup-plugin-terser';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let cachedToolbar;

/**
 *
 * @param {import('puppeteer').Page} page
 * @param {Object} config
 * @param {Boolean} initial
 * @returns
 */
export async function injectToolbar(page, config, initial) {
	if (!process.env.PREVIEW || !config.toolbar) {
		return;
	}

	if (!cachedToolbar) {
		cachedToolbar = await buildToolbar();
	}

	const customToolbar = typeof config.toolbar === 'function' ? `${config.toolbar(page, config, initial)}<hr/>` : '';

	await page.evaluate(
		(TEST_ID, testPath, config, customToolbar) => {
			window.abPreview = {
				testId: TEST_ID,
				config,
				testPath,
				customToolbar,
			};
		},
		process.env.TEST_ID,
		config.testPath.replace(process.cwd(), ''),
		config,
		customToolbar
	);

	if (cachedToolbar) {
		await page.addScriptTag({ content: cachedToolbar });
	}
}

async function buildToolbar() {
	const TEST_ID = 'tlbr01';

	const modDir = import.meta.url.includes('dist/bin/abdo.js')
		? path.join(__dirname, '..', '..')
		: path.join(__dirname, '..', '..', '..');

	const babelConfig = {
		babelrc: false,
		plugins: [
			'@babel/plugin-proposal-optional-chaining',
			'@babel/plugin-proposal-nullish-coalescing-operator',
			['@babel/plugin-transform-react-jsx', { pragma: 'h', pragmaFrag: 'hf', throwIfNamespace: false }],
			[
				'@emotion/babel-plugin-jsx-pragmatic',
				{
					module: path.join(modDir, 'src', 'jsx'),
					import: 'h, hf',
					export: 'h, hf',
				},
			],
		],
		extensions: ['.js', '.jsx'],
	};

	const bundle = await rollup({
		input: path.join(modDir, 'lib', 'utils', 'toolbar', 'index.js'),
		plugins: [
			alias({
				entries: [
					{ find: /^@\/(.*)/, replacement: path.join(modDir, '$1') },
					{ find: 'a-b-doer/hooks', replacement: path.join(modDir, 'hooks') },
					{ find: 'a-b-doer', replacement: path.join(modDir, 'main') },
				],
			}),
			nodeResolve({
				browser: true,
				preferBuiltins: false,
				extensions: babelConfig.extensions,
			}),
			babel({ ...babelConfig, babelHelpers: 'bundled' }),
			commonjs({ transformMixedEsModules: true }),
			styles({
				mode: ['inject', { singleTag: true, attributes: { 'data-id': TEST_ID } }],
				minimize: true,
				modules: {
					generateScopedName: (name, file) => {
						return 't' + stringHash(unifyPath(file)).toString(36).substr(0, 4) + '-' + name;
					},
				},
				plugins: [autoprefixer],
				url: { inline: true },
			}),
			replace({
				preventAssignment: true,
				values: {
					'process.env.PREACT': 'false',
					'process.env.preact': 'false',
					'process.env.NODE_ENV': process.env.NODE_ENV,
					'process.env.IE': 'false',
					'process.env.PREVIEW': process.env.PREVIEW,
					'process.env.TEST_ENV': process.env.TEST_ENV,
					'process.env.TEST_ID': JSON.stringify(TEST_ID),
				},
			}),
		],
	});

	const { output } = await bundle.generate({
		intro: 'const window = self; const document = window.document;',
		format: 'iife',
		plugins: [
			terser({
				mangle: { toplevel: true },
				format: { comments: false },
			}),
		],
	});

	return output[0]?.code;
}

function unifyPath(path) {
	return path.replace(process.cwd(), '').replace(/\\/g, '/');
}

const path = require('path');
const fs = require('fs');
const { rollup } = require('rollup');
const rollupWatch = require('rollup').watch;
const resolve = require('@rollup/plugin-node-resolve').default;
const babelPlugin = require('@rollup/plugin-babel').default;
const { terser } = require('rollup-plugin-terser');
const styles = require('rollup-plugin-styles');
const stringHash = require('string-hash');
const autoprefixer = require('autoprefixer');
const alias = require('@rollup/plugin-alias');
const replace = require('@rollup/plugin-replace');
const ejs = require('rollup-plugin-ejs');
const commonjs = require('@rollup/plugin-commonjs');
const { openPage } = require('./puppeteer');
const inlineSvg = require('rollup-plugin-inline-svg');
const svgImport = require('rollup-plugin-svg-hyperscript');
const image = require('@rollup/plugin-image');
const chunkImage = require('./plugins/rollup-chunk-image');
const browserslist = require('browserslist');
const { getFlagEnv, hashf } = require('./utils');
const chalk = require('chalk');
const browsers = browserslist();

const supportIE = !!browsers.find((b) => b.startsWith('ie'));

/**
 * Config defaults
 */
let config = {
	chunkImages: true,
	minify: true,
	modules: true,
	preact: false,
	watch: false,
};

async function bundler(testConfig) {
	let { entryFile, testPath, entry, entryPart } = testConfig;

	if (!entryFile && entry) {
		entryFile = entry;
		if (entry.startsWith('.')) {
			entryFile = path.join(testPath, entry);
		}
	}

	if (!entryPart && entry) {
		entryPart = entry;
	}

	if (!entryFile || !testPath) {
		throw new Error('Entry file or test path is missing');
	}

	const buildDir = path.join(testPath, '.build');
	// Ensure build folder
	try {
		if (!fs.existsSync(buildDir)) {
			fs.mkdirSync(buildDir);
		}
	} catch (error) {}

	testConfig = { ...config, ...testConfig, buildDir };

	const { minify, preact, modules, id, chunkImages, watch } = testConfig;

	const babelConfig = {
		babelrc: false,
		presets: [
			[
				'@babel/env',
				{
					modules: false,
				},
			],
		],
		plugins: [
			'transform-async-to-promises',
			'@babel/plugin-proposal-class-properties',
			'@babel/plugin-proposal-optional-chaining',
			'@babel/plugin-proposal-nullish-coalescing-operator',
			['@babel/plugin-transform-react-jsx', { pragma: 'h', pragmaFrag: preact ? 'Fragment' : 'hf' }],
			[
				'@emotion/babel-plugin-jsx-pragmatic',
				preact
					? {
							module: 'preact',
							import: 'h, Fragment',
							export: 'h, Fragment',
					  }
					: {
							module: '@/lib/jsx',
							import: 'h, hf',
							export: 'h, hf',
					  },
			],
		].filter(Boolean),
		exclude: /core-js/,
		extensions: ['.js', '.jsx'],
	};

	// Bundler behaves a little bit differently when there's style file as an entry.
	let stylesOnly = /\.(le|sa|sc|c)ss$/.test(entryFile);

	if (!entryFile) {
		throw new Error("Couldn't find entry file");
	}

	let styleFile = entryPart.split('.');
	styleFile.pop();
	styleFile.push('css');
	styleFile = styleFile.join('.');

	const inputOptions = {
		input: [entryFile],
		plugins: [
			resolve({ extensions: babelConfig.extensions }),
			babelPlugin({ ...babelConfig, babelHelpers: 'bundled' }),
			commonjs({ transformMixedEsModules: true }),
			styles({
				mode: ['extract', path.basename(styleFile)],
				minimize: minify,
				modules:
					modules !== false
						? {
								generateScopedName: minify
									? (name, file) => {
											const parentPath = path.dirname(path.dirname(file));
											file = file.replace(parentPath, '');
											return 't' + stringHash(file).toString(36).substr(0, 4) + '_' + name;
									  }
									: 't_[name]_[local]__[hash:4]',
						  }
						: undefined,
				plugins: [autoprefixer],
				url: { inline: true },
				alias: {
					scss: path.join(__dirname, '..', '/scss'),
					sass: path.join(__dirname, '..', '/sass'),
					less: path.join(__dirname, '..', '/less'),
					styles: path.join(__dirname, '..', '/styles'),
					css: path.join(__dirname, '..', 'css'),
					'@': path.join(__dirname, '..'),
				},
			}),
			alias({
				entries: [
					{ find: /^@\/(.*)/, replacement: path.join(__dirname, '..', '$1') },
					{ find: 'react', replacement: 'preact/compat' },
					{ find: 'react-dom', replacement: 'preact/compat' },
				],
			}),
			ejs({
				include: ['**/*.ejs', '**/*.html'],
			}),
			replace({
				'process.env.preact': getFlagEnv('PREACT') ?? !!preact,
				'process.env.NODE_ENV': JSON.stringify('production'),
				'process.env.IE': getFlagEnv('IE') ?? supportIE,
				'process.env.TEST_ID': JSON.stringify(
					id || 't' + (hashf(path.dirname(testPath.replace(process.env.INIT_CWD, ''))).toString(36) || '-default')
				),
			}),
			image({
				exclude: ['**/*.svg'],
			}),
			chunkImage(chunkImages),
			preact
				? svgImport({
						importDeclaration: 'import {h} from "preact"',
						pragma: 'h',
						transformPropNames: false,
				  })
				: inlineSvg({
						removeSVGTagAttrs: false,
				  }),
		],
		watch: false,
	};

	const outputOptions = {
		dir: buildDir,
		assetFileNames: path.basename(styleFile),
		strict: false,
		format: 'iife',
		exports: 'named',
		name: path.basename(entryFile).split('.')[0],
		plugins: [
			minify &&
				terser(
					Object.assign(
						{
							mangle: { toplevel: true },
						},
						chunkImages && {
							compress: {
								evaluate: false,
							},
						}
					)
				),
		].filter(Boolean),
	};

	let bundle;

	try {
		// First try to create bundle before opening the browser.
		bundle = await rollup(inputOptions);

		await bundle.write(outputOptions);
	} catch (error) {
		console.log(chalk.red('\nBundle error!'));
		throw new Error(error.message);
	}

	const createAssetBundle = () => {
		let js = '';
		let styles = '';

		try {
			// Remove dummy js generated by rollup
			if (stylesOnly) {
				let jsFile = entryPart.split('.');
				jsFile.pop();
				jsFile.push('js');
				fs.unlinkSync(path.resolve(buildDir, jsFile.join('.')));
			}
			// Include the js content
			else {
				js = fs.readFileSync(path.resolve(buildDir, entryPart.replace(/\.jsx$/, '.js')), 'utf8');
			}

			let styleFile = entryPart.split('.');
			styleFile.pop();
			styleFile.push('css');
			styles = fs.readFileSync(path.resolve(buildDir, styleFile.join('.')), 'utf8');
		} catch (error) {}

		let assetBundle = js;
		if (styles) {
			assetBundle =
				'(function(){' +
				"var s=document.createElement('style');s.innerText='" +
				styles.replace(/[\r\n]/g, ' ').replace(/'/g, "\\'") +
				"';" +
				'document.head.appendChild(s);' +
				js +
				'})()';
		}

		fs.writeFileSync(path.resolve(buildDir, '.bundle.js'), assetBundle);

		return { bundle: assetBundle, styles: !!styles, js: !!js };
	};

	let assetBundle = createAssetBundle(buildDir, entryPart);

	// Close the bundle if watch option is not set
	if (!watch) {
		// closes the bundle
		await bundle.close();
	}
	// Otherwise start rollup watcher
	else {
		watcher = rollupWatch({
			...inputOptions,
			output: outputOptions,
			watch: {
				buildDelay: 300,
				exclude: [path.join(testPath, '.build', '**')],
			},
		});

		let page;

		watcher.on('event', async (event) => {
			// Bundled successfully.
			if (event.code === 'END' && bundle) {
				await bundle.generate(outputOptions);
				assetBundle = createAssetBundle(buildDir, entryPart);
				page = await openPage({ ...testConfig, assetBundle }, true);
			}
			// Error in bundle process.
			else if (event.code === 'ERROR') {
				console.log(chalk.red('\nBundle error!'));
				console.error(event.error.message, '\n');

				if (page) {
					await page.evaluate((msg) => {
						// Chalk doesn't work in browser.
						console.log('\n\x1b[31m%s\x1b[0m', 'Bundle error!');
						console.warn(msg, '\n');
					}, event.error.message);
				}
			}
			// Process started
			else if (event.code === 'BUNDLE_START') {
				if (page) {
					await page.evaluate(() => {
						// Chalk doesn't work in browser.
						console.log('\x1b[92m%s\x1b[0m', 'Source code changed. Starting bundler...');
					});
				}
			}
			// End of bundle process, close the bundle
			else if (event.code === 'BUNDLE_END') {
				await event.result.close();
			}
			// event.code can be one of:
			//   START        — the watcher is (re)starting
			//   BUNDLE_START — building an individual bundle
			//   BUNDLE_END   — finished building a bundle
			//   END          — finished building all bundles
			//   ERROR        — encountered an error while bundling
		});
	}
	return { ...testConfig, assetBundle };
}

module.exports = {
	openPage,
	bundler,
};

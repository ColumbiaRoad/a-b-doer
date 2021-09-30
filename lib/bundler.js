import path from 'path';
import fs from 'fs';
import { rollup } from 'rollup';
import { watch as rollupWatch } from 'rollup';
import nodeResolve from '@rollup/plugin-node-resolve';
import babelPlugin from '@rollup/plugin-babel';
import { terser } from 'rollup-plugin-terser';
import styles from 'rollup-plugin-styles';
import stringHash from 'string-hash';
import autoprefixer from 'autoprefixer';
import alias from '@rollup/plugin-alias';
import replace from '@rollup/plugin-replace';
import ejs from 'rollup-plugin-ejs';
import commonjs from '@rollup/plugin-commonjs';
import { openPage } from './puppeteer';
import inlineSvg from 'rollup-plugin-inline-svg';
import svgImport from 'rollup-plugin-svg-hyperscript';
import image from '@rollup/plugin-image';
import chunkImage from './plugins/rollup-chunk-image';
import browserslist from 'browserslist';
import { getFlagEnv, hashf, unifyPath } from './utils';
import chalk from 'chalk';
import rimraf from 'rimraf';
import { glob } from 'glob';
import { preactDebug } from './preact-debug-plugin';

export * from './puppeteer';

const browsers = browserslist();

const supportIE = !!browsers.find((b) => b.startsWith('ie'));

const rootDir = path.join(__dirname, '..', '..');

export async function bundler(testConfig) {
	let { entryFile, testPath, entry, entryPart, preview = false } = testConfig;

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

	const buildDir = path.join(testPath, testConfig.buildDir);
	testConfig.buildDir = buildDir;

	// Ensure build folder
	try {
		if (!fs.existsSync(buildDir)) {
			fs.mkdirSync(buildDir);
		}
	} catch (error) {}

	const { minify: configMinify, preact, modules, id, chunkImages, watch, bundler: bundlerConfig = {} } = testConfig;
	const minify = configMinify ?? !watch;

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
							module: path.join(rootDir, '/src/jsx'),
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

	const cwd = process.cwd();

	const { plugins = [], input: _i, watch: _w, output = {}, ...restBundlerConfig } = bundlerConfig;

	// Assign some common process.env variables for bundler/etc and custom rollup plugins
	process.env.PREACT = process.env.preact = getFlagEnv('PREACT') ?? !!preact;
	process.env.NODE_ENV = JSON.stringify('production');
	process.env.IE = getFlagEnv('IE') ?? supportIE;
	process.env.PREVIEW = Boolean(watch || preview);
	process.env.TEST_ENV = getFlagEnv('TEST_ENV') || false;

	const inputOptions = {
		input: [entryFile],
		plugins: getPluginsConfig(
			[
				['preact-debug'],
				[
					'alias',
					{
						entries: [
							{ find: /^@\/(.*)/, replacement: path.join(cwd, '$1') },
							{ find: 'a-b-doer/hooks', replacement: path.join(rootDir, 'hooks') },
							{ find: 'a-b-doer', replacement: path.join(rootDir, 'main') },
							{ find: 'react', replacement: 'preact/compat' },
							{ find: 'react-dom', replacement: 'preact/compat' },
						],
					},
				],
				[
					'node-resolve',
					{
						extensions: babelConfig.extensions,
						moduleDirectories: ['node_modules', path.join(rootDir, 'node_modules')],
					},
				],
				['babel', { ...babelConfig, babelHelpers: 'bundled' }],
				['commonjs', { transformMixedEsModules: true }],
				[
					'styles',
					{
						mode: 'extract',
						minimize: minify,
						modules:
							modules !== false
								? {
										generateScopedName: minify
											? (name, file) => {
													return 't' + stringHash(unifyPath(file)).toString(36).substr(0, 4) + '-' + name;
											  }
											: 't_[dir]_[name]_[local]__[hash:4]',
								  }
								: undefined,
						plugins: [autoprefixer],
						url: { inline: true },
						alias: {
							scss: path.join(cwd, '/scss'),
							sass: path.join(cwd, '/sass'),
							less: path.join(cwd, '/less'),
							styles: path.join(cwd, '/styles'),
							css: path.join(cwd, 'css'),
							'@': cwd,
						},
					},
				],
				[
					'ejs',
					{
						include: ['**/*.ejs', '**/*.html'],
					},
				],
				[
					'replace',
					{
						preventAssignment: true,
						values: {
							'process.env.PREACT': process.env.PREACT,
							'process.env.preact': process.env.PREACT,
							'process.env.NODE_ENV': JSON.stringify('production'),
							'process.env.IE': process.env.IE,
							'process.env.PREVIEW': Boolean(watch || preview),
							'process.env.TEST_ENV': process.env.TEST_ENV,
							'process.env.TEST_ID': JSON.stringify(
								id || 't' + (hashf(path.dirname(unifyPath(testPath))).toString(36) || '-default')
							),
						},
					},
				],
				[
					'image',
					{
						exclude: ['**/*.svg'],
					},
				],
				chunkImage(chunkImages),
				preact
					? [
							'svg-hyperscript',
							{
								importDeclaration: 'import {h} from "preact"',
								pragma: 'h',
								transformPropNames: false,
							},
					  ]
					: [
							'inline-svg',
							{
								removeSVGTagAttrs: false,
							},
					  ],
			],
			[...plugins]
		),
		watch: false,
		...restBundlerConfig,
	};

	const sourceMapOptions =
		watch && testConfig.sourcemap !== false
			? {
					sourcemap: 'inline',
					sourcemapPathTransform: (relativeSourcePath, sourcemapPath) => {
						// will replace relative paths with absolute paths
						return 'file:///' + path.resolve(path.dirname(sourcemapPath), relativeSourcePath);
					},
			  }
			: {};

	const outputOptions = {
		dir: buildDir,
		assetFileNames: '[name].css',
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
		...sourceMapOptions,
		...output,
	};

	let bundle;
	let bundleOutput = { output: [] };

	if (outputOptions.entryFileNames && !output.assetFileNames) {
		outputOptions.assetFileNames = getFileAs(outputOptions.entryFileNames, 'css');
	}

	const clearHashedAssets = () => {
		// Check for hashed file names
		if (/\[hash(]|:)/.test(outputOptions.entryFileNames)) {
			// Clear previous hashed files from the build folder.
			const files = glob.sync('**/*.?(js|css)', { cwd: buildDir, dot: true });
			files.forEach((file) => {
				rimraf(`${buildDir}/${file}`, (err) => {
					if (err) console.error(err);
				});
			});
		}
	};

	if (!watch) {
		clearHashedAssets();
	}

	try {
		// First try to create bundle before opening the browser.
		bundle = await rollup(inputOptions);

		bundleOutput = await bundle.write(outputOptions);
	} catch (error) {
		console.log(chalk.red('\nBundle error!'));
		throw new Error(error.message);
	}

	let mainChunk = bundleOutput.output[0];
	let cssChunk = bundleOutput.output[1];

	const fnIifeCheck = /^(\(|function)/;

	const createAssetBundle = () => {
		let js = mainChunk?.code;
		let styles = cssChunk?.source;
		let sourcemap = '';

		// Remove dummy js generated by rollup
		if (stylesOnly) {
			fs.unlink(path.resolve(buildDir, mainChunk.fileName), (err) => {});
		}
		// Include the js content
		else {
			sourcemap = mainChunk.map?.toUrl();
			if (sourcemap) {
				sourcemap = '\n//# sourceMappingURL=' + sourcemap;
			}
			// Make sure that the built IIFE starts with ! (e.g. Hubspot cli filemanager upload fails without this)
			if (fnIifeCheck.test(js) && outputOptions.format === 'iife') {
				js = '!' + js;
				fs.writeFile(path.resolve(buildDir, mainChunk.fileName), js + sourcemap, (err) => {});
			}
		}

		let assetBundle = js;

		if (styles) {
			/* prettier-ignore */
			assetBundle = (js ? "!(function(){" + js + "})();" : "") +
				"!(function(){" +
					"var __a,__s,__f=function(){" +
						"if(__a){return;}" +
						"__a=1;" +
						"__s=document.createElement('style');__s.innerHTML='" +
						styles.replace(/([\r\n\s]+)/g, ' ').replace(/'/g, "\\'") +
						"';" +
						"document.head.appendChild(__s);" +
					"};" +
					(testConfig.appendStyles ? "__f();" : "window._addStyles=__f;") +
				"})();" + sourcemap;
		}
		// Make sure that the built IIFE starts with ! (e.g. Hubspot cli filemanager upload fails without this)
		else if (assetBundle && fnIifeCheck.test(assetBundle) && outputOptions.format === 'iife') {
			assetBundle = '!' + assetBundle;
		}

		fs.writeFile(
			path.resolve(buildDir, getFileAs(mainChunk.fileName, 'bundle.js')),
			assetBundle,
			(err) => err && console.error(err)
		);

		return { bundle: assetBundle, styles: !!styles, js: !!js };
	};

	let assetBundle;
	let watcher;

	// Close the bundle if watch option is not set
	if (!watch) {
		assetBundle = createAssetBundle(buildDir, entryPart);
		// closes the bundle
		await bundle.close();
	}
	// Otherwise start rollup watcher
	else {
		const watcherConfig = {
			...inputOptions,
			output: outputOptions,
			watch: {
				buildDelay: 300,
				exclude: [path.join(testConfig.buildDir, '**')],
			},
		};

		if (testConfig.debug) {
			console.log('Starting watcher, with config');
			console.log(watcherConfig);
		}

		watcher = rollupWatch(watcherConfig);

		let page;
		let hasError = false;

		watcher.on('event', async (event) => {
			// Error in bundle process.
			if (event.code === 'ERROR') {
				console.log(chalk.red('\nBundle error!'));
				console.error(event.error.message, '\n');
				hasError = true;

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
				clearHashedAssets();
				hasError = false;
				if (page) {
					await page.evaluate(() => {
						// Chalk doesn't work in browser.
						console.log('\x1b[92m%s\x1b[0m', 'Source code changed. Starting bundler...');
					});
				}
			}
			// End of bundle process, close the bundle
			else if (event.code === 'BUNDLE_END') {
				if (hasError) {
					return;
				}
				bundleOutput = await event.result.generate(outputOptions);
				mainChunk = bundleOutput.output[0];
				cssChunk = bundleOutput.output[1];
				assetBundle = createAssetBundle(buildDir, entryPart);
				page = await openPage({ ...testConfig, assetBundle }, true);
				hasError = false;
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
	return { ...testConfig, assetBundle, watcher };
}

/**
 * Returns given entry file path as some other extension.
 * @param {string} entryPart
 * @param {string} ext
 */
function getFileAs(entryPart, ext) {
	const entryPathArrWithoutExt = entryPart.split('.').slice(0, -1);
	return entryPathArrWithoutExt.concat(ext).join('.');
}

/**
 * Returns an array containing plugins for the bundler input configuration.
 * @param {Array} defaults
 * @param {Array} [override]
 */
function getPluginsConfig(defaults, override = []) {
	const fns = {
		alias,
		'node-resolve': nodeResolve,
		babel: babelPlugin,
		styles,
		replace,
		ejs,
		commonjs,
		'inline-svg': inlineSvg,
		'svg-hyperscript': svgImport,
		image,
		'preact-debug': preactDebug,
	};

	return defaults
		.map((plugin) => {
			if (!Array.isArray(plugin)) return plugin;
			const [key, options] = plugin;

			const fn = fns[key];

			const overridePlugin = override.find((op) => {
				if (!Array.isArray(op)) return false;
				return op[0] === key;
			});

			if (overridePlugin) {
				// Remove the found override plugin.
				override.splice(override.indexOf(overridePlugin), 1);
				// If plugin config is a function, call it with the original plugin config.
				if (typeof overridePlugin[1] === 'function') {
					return fn(overridePlugin[1](options));
				} else {
					return fn(overridePlugin[1]);
				}
			}
			return fn(options);
		})
		.concat(
			override.map((plugin) => {
				let fn = plugin;
				if (Array.isArray(fn)) {
					if (typeof fn[1] === 'function') {
						return fn[1]();
					} else {
						console.error(
							chalk.red(
								`There's no default plugin for ${chalk.bold(fn[0])}. Can't call default plugin with given argument `,
								fn[1]
							)
						);
						console.error(
							chalk.red(`Custom plugins should be inserted as objects or as a [string, function] tuple, got`),
							fn
						);
					}
				}
				if (typeof fn === 'function') {
					return fn();
				}
				return fn;
			})
		);
}

export * from './puppeteer';
import alias from '@rollup/plugin-alias';
import autoprefixer from 'autoprefixer';
import chalk from 'chalk';
import commonjs from '@rollup/plugin-commonjs';
import fs from 'fs';
import glob from 'glob';
import iife from 'rollup-plugin-iife';
import image from '@rollup/plugin-image';
import inlineSvg from 'rollup-plugin-inline-svg';
import nodeResolve from '@rollup/plugin-node-resolve';
import path from 'path';
import replace from '@rollup/plugin-replace';
import rimraf from 'rimraf';
import stringHash from 'string-hash';
import styles from 'rollup-plugin-styles';
import svgImport from 'rollup-plugin-svg-hyperscript';
import typescript from 'rollup-plugin-typescript2';
import { babel } from '@rollup/plugin-babel';
import { fileURLToPath } from 'url';
import { minify as terserMinify } from 'terser';
import { rollup } from 'rollup';
import { terser } from 'rollup-plugin-terser';
import { watch as rollupWatch } from 'rollup';
import browserslist from 'browserslist';
import chunkImage from './plugins/rollup-chunk-image';
import { getFlagEnv, hashf, unifyPath } from './utils';
import { openPage } from './puppeteer';
import { preactDebug } from './preact-debug-plugin';

// __dirname is not defined in ES module scope
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const browsers = browserslist();

const supportIE = !!browsers.find((b) => b.startsWith('ie'));

const rootDir = __dirname.replace(/(\/|\\)(dist|bin|lib).*/, '');

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

	const {
		minify: configMinify,
		preact,
		modules,
		id,
		chunks,
		chunkImages,
		watch,
		features,
		bundler: bundlerConfig = {},
	} = testConfig;
	const minify = configMinify ?? !watch;

	const babelConfig = {
		babelrc: false,
		presets: [
			[
				'@babel/preset-typescript',
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
			[
				'@babel/plugin-transform-react-jsx',
				{ pragma: 'h', pragmaFrag: preact ? 'Fragment' : 'hf', throwIfNamespace: false },
			],
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
		extensions: ['.js', '.jsx', '.ts', '.tsx'],
	};

	// Bundler behaves a little bit differently when there's style file as an entry.
	let stylesOnly = /\.(le|sa|sc|c)ss$/.test(entryFile);

	if (!entryFile) {
		throw new Error("Couldn't find entry file");
	}

	const useSourcemaps = watch && testConfig.sourcemap !== false;

	const cwd = process.cwd();

	const { plugins = [], input: _i, watch: _w, output = {}, ...restBundlerConfig } = bundlerConfig;

	// Get parsed boolean values from some common process.env variables
	const PREACT = getFlagEnv('PREACT') ?? !!preact;
	const NODE_ENV = JSON.stringify('production');
	const IE = getFlagEnv('IE') ?? supportIE;
	const PREVIEW = Boolean(watch || preview);
	const TEST_ENV = getFlagEnv('TEST_ENV') || false;
	const TEST_ID = id || 't' + (hashf(path.dirname(unifyPath(entryFile))).toString(36) || '-default');
	// Assign some common process.env variables for bundler/etc and custom rollup plugins
	process.env.PREACT = process.env.preact = PREACT;
	process.env.NODE_ENV = NODE_ENV;
	process.env.IE = IE;
	process.env.PREVIEW = PREVIEW;
	process.env.TEST_ENV = TEST_ENV;
	process.env.TEST_ID = TEST_ID;

	const featuresReplaces = {};
	Object.entries(features).forEach(([key, value]) => {
		if (value !== 'auto') {
			const letter = key === 'className' ? 'x' : key[0];
			featuresReplaces[`config.${letter}`] = value.toString();
		}
	});

	const chunksInputConfig = chunks
		? {
				preserveEntrySignatures: 'allow-extension',
				inlineDynamicImports: false,
		  }
		: {};

	const inputOptions = {
		input: [entryFile],
		treeshake: {
			propertyReadSideEffects: false,
			moduleSideEffects: true,
			tryCatchDeoptimization: false,
			unknownGlobalSideEffects: false,
			correctVarValueBeforeDeclaration: false,
		},
		plugins: getPluginsConfig(
			[
				['preact-debug'],
				[
					'alias',
					{
						entries: [
							{ find: /^@\/(.*)/, replacement: path.join(cwd, '$1') },
							{ find: 'react', replacement: 'preact/compat' },
							{ find: 'react-dom', replacement: 'preact/compat' },
						],
					},
				],
				[
					'typescript',
					useSourcemaps
						? {
								tsconfigOverride: {
									compilerOptions: {
										sourceMap: true,
										inlineSourceMap: true,
									},
								},
						  }
						: {},
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
					'replace',
					{
						preventAssignment: true,
						values: {
							'process.env.PREACT': PREACT,
							'process.env.preact': PREACT,
							'process.env.NODE_ENV': NODE_ENV,
							'process.env.IE': IE,
							'process.env.PREVIEW': PREVIEW,
							'process.env.TEST_ENV': TEST_ENV,
							'process.env.TEST_ID': JSON.stringify(TEST_ID),
							...featuresReplaces,
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
				chunks && ['iife'],
			].filter(Boolean),
			[...plugins]
		),
		watch: false,
		...chunksInputConfig,
		...restBundlerConfig,
	};

	const sourceMapOptions = useSourcemaps
		? {
				sourcemap: 'inline',
				sourcemapPathTransform: (relativeSourcePath, sourcemapPath) => {
					// will replace relative paths with absolute paths
					return 'file:///' + path.resolve(path.dirname(sourcemapPath), relativeSourcePath);
				},
		  }
		: {};

	const chunksOuputConfig = chunks
		? {
				format: 'amd',
				amd: {
					autoId: true,
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
		// When frequently used global variables are local, they could be minified by terser.
		intro: minify ? 'const window = self; const document = window.document;' : '',
		plugins: [
			minify &&
				terser(
					Object.assign(
						{
							mangle: { toplevel: true },
							format: { comments: false },
						},
						chunkImages && {
							compress: {
								evaluate: false,
							},
						}
					)
				),
		].filter(Boolean),
		...chunksOuputConfig,
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
		if (/\[hash(]|:)/.test(outputOptions.entryFileNames) || chunks) {
			// Clear previous hashed files from the build folder.
			const files = glob.sync('**/*.?(js|css|map)', { cwd: buildDir, dot: true });
			files.forEach((file) => {
				rimraf(`${buildDir}/${file}`, (err) => {
					if (err) console.error(err);
				});
			});
		}
	};

	const fnIifeCheck = /^(\(|function)/;

	const createAssetBundle = async () => {
		let mainChunk = bundleOutput.output[0];
		let cssChunks = bundleOutput.output.filter((c) => c.fileName.endsWith('.css'));

		let js = mainChunk?.code;
		let styles = cssChunks.reduce((acc, cur) => acc + cur.source, '');

		// Remove dummy js generated by rollup
		if (stylesOnly) {
			fs.unlink(path.resolve(buildDir, mainChunk.fileName), (err) => {});
		}

		const outputChunks = [...bundleOutput.output];

		let amd;

		if (chunks) {
			const amdLoader = fs.readFileSync(path.resolve(__dirname, 'amd.js')).toString();
			amd = await terserMinify(
				{ 'amd.js': amdLoader },
				{ sourceMap: useSourcemaps && { includeSources: true, asObject: true } }
			);

			const { code, fileName, facadeModuleId, modules } = mainChunk;

			// Inject amd loader to main chunk on build process.
			if (!watch) {
				fs.writeFile(path.resolve(buildDir, fileName), `!(function(){${amd.code}\n${code}})();`, (err) => {
					err && console.error(err);
				});
			}

			// amd loader should be the first chunk on the bundle
			outputChunks.unshift(amd);

			const mainModuleId = fileName.substr(0, fileName.lastIndexOf('.'));
			// Get the written exports of the file so we could know which function to call.
			const exps = modules[facadeModuleId]?.renderedExports || [];
			if (!exps.length) {
				console.warn(
					chalk.yellow('File ', facadeModuleId, 'has no exported functions. Chunk initialization will fail.')
				);
				process.exit();
			}
			const exportIndex = Math.max(exps.indexOf('default'), 0);

			// Inject the initialization snippet to the chunks array
			outputChunks.push({ code: `require(['${mainModuleId}'],function(m){m.${exps[exportIndex]}()});` });
		}

		// Base for the bundle map that contains other maps.
		const bundleMap = {
			version: 3,
			file: getFileAs(mainChunk.fileName, 'bundle.js'),
			sections: [],
		};

		// Create javascript bundle and keep track where chunk code starts for sourcemaps
		let assetBundle = outputChunks
			.filter((c) => !!c.code)
			.reduce((bundle, chunk) => {
				if (chunk.map) {
					bundleMap.sections.push({ offset: { line: bundle.split('\n').length - 1, column: 0 }, map: chunk.map });
				}
				let bundleCode = bundle.trim();
				if (bundleCode) bundleCode += '\n';
				return `${bundleCode}${chunk.code}`;
			}, '')
			.trim();

		if (styles) {
			/* prettier-ignore */
			assetBundle +=
				"!(function(){" +
					"var __a,__s,__f=function(){" +
						"if(__a){return;}" +
						"__a=1;" +
						"__s=document.createElement('style');__s.dataset.id='"+TEST_ID+"',__s.innerHTML='" +
						styles.replace(/([\r\n\s]+)/g, ' ').replace(/'/g, "\\'") +
						"';" +
						"document.head.appendChild(__s);" +
					"};" +
					(testConfig.appendStyles ? "__f();" : "window._addStyles=__f;") +
				"})();"
		}
		// Make sure that the built IIFE starts with ! (e.g. Hubspot cli filemanager upload fails without this)
		if (assetBundle && fnIifeCheck.test(assetBundle) && outputOptions.format === 'iife') {
			assetBundle = '!' + assetBundle;
		}

		if (watch) {
			assetBundle +=
				'\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,' +
				Buffer.from(JSON.stringify(bundleMap)).toString('base64');

			if (testConfig.debug) {
				fs.writeFile(path.resolve(buildDir, 'bundle.js.map'), JSON.stringify(bundleMap), (err) => {
					if (!err) {
						console.log('Wrote bundle.js.map to build folder.');
					} else {
						console.error(err);
					}
				});
			}
		}

		fs.writeFile(path.resolve(buildDir, getFileAs(mainChunk.fileName, 'bundle.js')), assetBundle, (err) => {
			if (err) {
				console.error(err);
			} else if (!TEST_ENV && !watch) {
				const mainChunk = bundleOutput.output[0];
				const bundleName = getFileAs(mainChunk.fileName, 'bundle.js');
				const bundleSize = toKb(assetBundle);

				const len = bundleOutput.output.reduce((acc, cur) => Math.max(acc, cur.fileName.length), bundleName.length) + 3;
				const fullLen = len + bundleSize.length;

				console.log(chalk.cyan('Output size:'));
				console.log(chalk.cyan('-'.repeat(fullLen)));
				bundleOutput.output.forEach((output, index) => {
					let code = output.code || output.source || '';
					if (!index && amd) {
						code = `!(function(){${amd.code}\n${code}})();`;
					}
					const line = output.fileName.padEnd(len) + toKb(code).padStart(bundleSize.length) || '';
					console.log(chalk.cyan(line));
				});

				console.log(chalk.cyan(bundleName.padEnd(len) + bundleSize));
				console.log(chalk.cyan('-'.repeat(fullLen)));
				console.log();
			}
		});

		return { bundle: assetBundle, styles: !!styles, js: !!js };
	};

	let assetBundle;
	let watcher;

	// Close the bundle if watch option is not set
	if (!watch) {
		clearHashedAssets();

		try {
			bundle = await rollup(inputOptions);
			bundleOutput = await bundle.write(outputOptions);
		} catch (error) {
			console.log(chalk.red('\nBundle error!'));
			throw new Error(error.message);
		}

		assetBundle = await createAssetBundle(buildDir, entryPart);

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
				if (page) {
					console.log(chalk.cyan('Source code changed.'));
					await page.evaluate(() => {
						// Chalk doesn't work in browser.
						console.log('\x1b[92m%s\x1b[0m', 'Source code changed. Starting bundler...');
					});
				}
				console.log(chalk.cyan('Starting bundler...'));
				clearHashedAssets();
				hasError = false;
			}
			// End of bundle process, close the bundle
			else if (event.code === 'BUNDLE_END') {
				if (hasError) {
					return;
				}
				bundleOutput = await event.result.generate(outputOptions);
				assetBundle = await createAssetBundle(buildDir, entryPart);
				try {
					page = await openPage({ ...testConfig, assetBundle }, true);
				} catch (error) {
					console.log('Error while opening page', error);
				}
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

function toKb(str = '') {
	return Math.round((str.length / 1024) * 10) / 10 + ' kB';
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
		babel,
		styles,
		replace,
		commonjs,
		iife,
		'inline-svg': inlineSvg,
		'svg-hyperscript': svgImport,
		image,
		'preact-debug': preactDebug,
		typescript,
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

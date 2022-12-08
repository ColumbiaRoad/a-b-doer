export * from './puppeteer';
import chalk from 'chalk';
import fs from 'fs';
import glob from 'glob';
import path from 'path';
import replace from '@rollup/plugin-replace';
import rimraf from 'rimraf';
// import stringHash from 'string-hash';
import svgr from 'vite-plugin-svgr';
import { fileURLToPath } from 'url';
import browserslist from 'browserslist';
// import chunkImage from './plugins/rollup-chunk-image';
import { getFlagEnv, hashf, unifyPath } from './utils';
import { openPage } from './puppeteer';
import { preactDebug } from './preact-debug-plugin';
// import esbuild from 'rollup-plugin-esbuild';
import { createServer } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// __dirname is not defined in ES module scope
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const browsers = browserslist();

const supportIE = !!browsers.find((b) => b.startsWith('ie'));

const rootDir = __dirname.replace(/(\/|\\)(dist|bin|lib).*/, '');

const cwd = process.cwd();

const DEV_SERVER_PORT = process.env.DEV_SERVER_PORT || 5173;

const defaultConfig = {
	bundler: {
		resolve: {
			alias: [
				{ find: /^@\/(.*)/, replacement: path.join(cwd, '$1') },
				{ find: 'react', replacement: 'preact/compat' },
				{ find: 'react-dom', replacement: 'preact/compat' },
				{ find: 'react/jsx-runtime', replacement: 'preact/jsx-runtime' },
			],
		},
	},
};

export async function bundler(buildSpecConfig) {
	let { getBundlerConfig, getSpecConfig, ...restConfig } = buildSpecConfig;

	const testConfig = getSpecConfig({ ...restConfig, ...defaultConfig });

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

	const { minify: configMinify, preact, modules, id, chunks, chunkImages, watch, features } = testConfig;
	const minify = configMinify ?? !watch;

	// Bundler behaves a little bit differently when there's style file as an entry.
	let stylesOnly = /\.(le|sa|sc|c)ss$/.test(entryFile);

	if (!entryFile) {
		throw new Error("Couldn't find entry file");
	}

	const useSourcemaps = watch && testConfig.sourcemap !== false;

	// Get parsed boolean values from some common process.env variables
	const PREACT = getFlagEnv('PREACT') ?? !!preact;
	const NODE_ENV = JSON.stringify(watch ? 'development' : 'production');
	const IE = getFlagEnv('IE') ?? supportIE;
	const PREVIEW = Boolean(watch || preview);
	const TEST_ENV = getFlagEnv('TEST_ENV') || false;
	const TEST_ID = id || 't' + (hashf(path.dirname(unifyPath(entryFile))).toString(36) || '-default');
	// Assign some common process.env variables for bundler/etc and custom rollup plugins
	process.env.PREACT = process.env.preact = PREACT;
	process.env.IE = IE;
	process.env.PREVIEW = PREVIEW;
	process.env.TEST_ENV = TEST_ENV;
	process.env.TEST_ID = TEST_ID;
	process.env.NODE_ENV = NODE_ENV;

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

	const chunksOuputConfig = chunks
		? {
				format: 'system',
				name: '',
		  }
		: {};

	const outputOptions = {};

	const jsxInject = preact
		? 'import {h,Fragment} from "preact"'
		: `import {h,hf} from "${path.join(rootDir, '/src/jsx')}"`;

	const bundlerConfig = getBundlerConfig({
		...(stylesOnly
			? {
					optimizeDeps: {
						entries: [entryFile],
					},
			  }
			: {}),
		esbuild: {
			jsxFactory: 'h',
			jsxFragment: preact ? 'Fragment' : 'hf',
			jsxInject,
		},
		build: {
			rollupOptions: {
				input: [entryFile],
				...chunksInputConfig,
				output: {
					dir: buildDir,
					assetFileNames: '[name].css',
					strict: false,
					format: 'iife',
					exports: 'named',
					name: path.basename(entryFile).split('.')[0],
					intro: minify ? 'const window = self; const document = window.document;' : '',
					...chunksOuputConfig,
				},
			},
		},
		clearScreen: false,
		...defaultConfig.bundler,
		plugins: getPluginsConfig(
			[
				['preact-debug'],
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
					'svgr',
					{
						exportAsDefault: true,
						svgrOptions: {
							jsxRuntime: 'automatic',
						},
						esbuildOptions: {
							jsxFactory: 'h',
							jsxFragment: preact ? 'Fragment' : 'hf',
							banner: jsxInject, // Use banner because jsxInject doesn't work
						},
						include: '**/*.svg',
					},
				],
			],
			defaultConfig.bundler.plugins
		),
	});

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

		if (!watch) {
			fs.writeFile(path.resolve(buildDir, getFileAs(mainChunk.fileName, 'bundle.js')), assetBundle, (err) => {
				if (err) {
					console.error(err);
				} else if (!TEST_ENV) {
					const mainChunk = bundleOutput.output[0];
					const bundleName = getFileAs(mainChunk.fileName, 'bundle.js');
					const bundleSize = toKb(assetBundle);

					const len =
						bundleOutput.output.reduce((acc, cur) => Math.max(acc, cur.fileName.length), bundleName.length) + 3;
					const fullLen = len + bundleSize.length;

					console.log(chalk.cyan('Output size:'));
					console.log(chalk.cyan('-'.repeat(fullLen)));
					bundleOutput.output.forEach((output, index) => {
						let code = output.code || output.source || '';
						const line = output.fileName.padEnd(len) + toKb(code).padStart(bundleSize.length) || '';
						console.log(chalk.cyan(line));
					});

					console.log(chalk.cyan(bundleName.padEnd(len) + bundleSize));
					console.log(chalk.cyan('-'.repeat(fullLen)));
					console.log();
				}
			});
		}

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
	// Otherwise start vite dev server
	else {
		const server = await createServer({
			root: testPath,
			configFile: false,
			server: {
				port: DEV_SERVER_PORT,
				https: true,
				cors: {
					origin: '*',
					methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
					preflightContinue: false,
					optionsSuccessStatus: 204,
				},
				watch: {
					ignored: [path.join(testConfig.buildDir, '**')],
				},
			},
			...bundlerConfig,
			plugins: [basicSsl()].concat(bundlerConfig.plugins).filter(Boolean),
		});

		await server.listen(DEV_SERVER_PORT);

		let page;
		let hasError = false;

		const injection = `
		!(() => {
			document.head.appendChild(Object.assign(document.createElement('script'), {
				type: 'module',
				src: 'https://localhost:${DEV_SERVER_PORT}/@vite/client',
			}));
			document.head.appendChild(Object.assign(document.createElement('script'), {
				type: 'module',
				src: 'https://localhost:${DEV_SERVER_PORT}${entryFile}',
			}));
		})();
		`;

		try {
			page = await openPage({ ...testConfig, assetBundle: { js: true, bundle: injection } }, true);
		} catch (error) {
			console.log('Error while opening page', error);
		}
		// const watcherConfig = {
		// 	...inputOptions,
		// 	output: outputOptions,
		// 	watch: {
		// 		buildDelay: 100,
		// 		skipWrite: true,
		// 		exclude: [path.join(testConfig.buildDir, '**')],
		// 	},
		// };

		// if (testConfig.debug) {
		// 	console.log('Starting watcher, with config');
		// 	console.log(watcherConfig);
		// }

		// watcher = rollupWatch(watcherConfig);

		// let page;
		// let hasError = false;

		// watcher.on('event', async (event) => {
		// 	// Error in bundle process.
		// 	if (event.code === 'ERROR') {
		// 		console.log(chalk.red('\nBundle error!'));
		// 		console.error(event.error.message, '\n');
		// 		hasError = true;

		// 		if (page) {
		// 			await page.evaluate((msg) => {
		// 				// Chalk doesn't work in browser.
		// 				console.log('\n\x1b[31m%s\x1b[0m', 'Bundle error!');
		// 				console.warn(msg, '\n');
		// 			}, event.error.message);
		// 		}
		// 	}
		// 	// Process started
		// 	else if (event.code === 'BUNDLE_START') {
		// 		if (page) {
		// 			console.log(chalk.cyan('Source code changed.'));
		// 			page.evaluate(() => {
		// 				// Chalk doesn't work in browser.
		// 				console.log('\x1b[92m%s\x1b[0m', 'Source code changed. Starting bundler...');
		// 			});
		// 		}
		// 		console.log(chalk.cyan('Starting bundler...'));
		// 		clearHashedAssets();
		// 		hasError = false;
		// 	}
		// 	// End of bundle process, close the bundle
		// 	else if (event.code === 'BUNDLE_END') {
		// 		if (hasError) {
		// 			return;
		// 		}
		// 		bundleOutput = await event.result.generate(outputOptions);
		// 		assetBundle = await createAssetBundle(buildDir, entryPart);
		// 		try {
		// 			page = await openPage({ ...testConfig, assetBundle }, true);
		// 		} catch (error) {
		// 			console.log('Error while opening page', error);
		// 		}
		// 		hasError = false;
		// 		await event.result.close();
		// 	}
		// 	// event.code can be one of:
		// 	//   START        — the watcher is (re)starting
		// 	//   BUNDLE_START — building an individual bundle
		// 	//   BUNDLE_END   — finished building a bundle
		// 	//   END          — finished building all bundles
		// 	//   ERROR        — encountered an error while bundling
		// });
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
		'preact-debug': preactDebug,
		svgr,
		replace,
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
					}
					// Allow removal
					else if (fn[1] === null) {
						return null;
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

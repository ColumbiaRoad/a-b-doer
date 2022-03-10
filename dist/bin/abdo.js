#!/usr/bin/env node
import chalk from 'chalk';
import chokidar from 'chokidar';
import minimist from 'minimist';
import path from 'path';
import pluginutils, { createFilter } from '@rollup/pluginutils';
import fs, { readFileSync, lstatSync, readdirSync } from 'fs';
import merge from 'lodash.merge';
import { createRequire } from 'module';
import puppeteerCore from 'puppeteer-core';
import alias from '@rollup/plugin-alias';
import autoprefixer from 'autoprefixer';
import commonjs from '@rollup/plugin-commonjs';
import glob from 'glob';
import iife from 'rollup-plugin-iife';
import image from '@rollup/plugin-image';
import inlineSvg from 'rollup-plugin-inline-svg';
import nodeResolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import rimraf from 'rimraf';
import stringHash from 'string-hash';
import styles from 'rollup-plugin-styles';
import svgImport from 'rollup-plugin-svg-hyperscript';
import typescript from 'rollup-plugin-typescript2';
import { babel } from '@rollup/plugin-babel';
import { fileURLToPath } from 'url';
import { minify } from 'terser';
import { rollup, watch as watch$1 } from 'rollup';
import { terser } from 'rollup-plugin-terser';
import browserslist from 'browserslist';

const specRequire$1 = createRequire(import.meta.url);

function getFlagEnv(name) {
	const val = process.env[name];
	if (val === true || val === 'true') return true;
	if (val === 'false' || val === 'false') return false;
	return undefined;
}

function hashf(s) {
	let hash = 0;
	let strlen = s.length;

	if (strlen === 0) {
		return hash;
	}
	for (let i = 0; i < strlen; i++) {
		let c = s.charCodeAt(i);
		hash = (hash << 5) - hash + c;
		hash = hash & hash; // Convert to 32bit integer
	}
	return hash;
}

function unifyPath(path) {
	return path.replace(process.cwd(), '').replace(/\\/g, '/');
}

/**
 * Converts given file path to format that is supported by different environments (Win uses file urls).
 * @param {String} path
 * @returns {String}
 */
function convertToEsmPath(path) {
	/* need to prepend configPath with file:// if function receives a Windows path */
	if (process.platform == 'win32' && !path.startsWith('file://')) {
		return specRequire$1('url').pathToFileURL(path).href;
	}
	return path;
}

// Require is not defined in ES module scope
const specRequire = createRequire(import.meta.url);

/**
 * Config defaults
 */
const config = {
	appendStyles: true,
	buildDir: '.build',
	chunkImages: false,
	chunks: false,
	devtools: true,
	historyChanges: true,
	modules: true,
	preact: false,
	sourcemap: true,
	watch: false,
	windowSize: [1920, 1080],
	features: {
		hooks: 'auto',
		jsx: 'auto',
		classes: true,
		className: true,
		namespaces: true,
	},
};

async function getConfigFileJsonOrJSContent(configPath) {
	const fileDir = path.dirname(configPath);
	const fileWithoutExt = path.basename(configPath, '.json');
	const configPathJs = path.resolve(fileDir, fileWithoutExt + '.js');
	if (fs.existsSync(configPath)) {
		// Clear require cache before loading the file
		delete specRequire.cache[configPath];
		return specRequire(configPath);
	} else if (fs.existsSync(configPathJs)) {
		// Import file with a cache buster
		const { default: configMod } = await import(
			convertToEsmPath(configPathJs) + '?cb=' + Math.random().toString(36).substring(3)
		);
		return configMod;
	}
	return {};
}

async function mergeSpecs(testConfig, specConfigPath) {
	const specConfig = await getConfigFileJsonOrJSContent(specConfigPath);
	if (!Object.keys(specConfig).length) {
		return;
	}
	merge(testConfig, specConfig);
	testConfig._specFiles = testConfig._specFiles || [];
	testConfig._specFiles.push(specConfigPath, specConfigPath.substr(0, specConfigPath.length - 2));
}

async function buildspec (testPath) {
	if (!testPath) {
		console.log('Test folder is missing');
		process.exit();
	}

	let entryFile = '';

	try {
		// If the test path argument is a file, use it as an entry
		if (!fs.lstatSync(testPath).isDirectory()) {
			let testDir = path.dirname(testPath);
			entryFile = testPath.replace(testDir, '.');
			testPath = testDir;
		}
	} catch (error) {
		console.error(error);
		process.exit();
	}

	if (!fs.existsSync(testPath)) {
		console.log('Test folder does not exist', testPath);
		process.exit();
	}

	// Check & load build related data
	const testConfig = {};

	await mergeSpecs(testConfig, path.resolve(process.cwd(), 'config.json'));

	try {
		await mergeSpecs(testConfig, path.join(testPath, '..', 'buildspec.json'));
		await mergeSpecs(testConfig, path.join(testPath, 'buildspec.json'));
	} catch (error) {
		console.error(error);
	}

	// Empty config object or the buildspec.json is missing
	if (!Object.keys(testConfig).length) {
		return null;
	}

	if (!entryFile) {
		if (testConfig.entry) {
			entryFile = testConfig.entry;
		} else {
			const files = fs.readdirSync(testPath, { encoding: 'utf8' });
			// Find first index file
			const indexFile = files.find((file) => /index\.(jsx?|tsx?|(le|sa|sc|c)ss)$/.test(file));
			if (indexFile) {
				entryFile = indexFile;
			}
			// Try some style file
			else {
				entryFile = files.find((file) => /styles?\.(le|sa|sc|c)ss$/.test(file));
			}
		}
	}

	let entryPart = entryFile;
	if (entryFile) {
		entryFile = path.resolve(testPath, entryFile);
	}

	if (!entryFile) return null;

	// Check that given entry is not excluded.
	const filter = createFilter(testConfig.include, testConfig.exclude);
	if (!filter(entryFile)) {
		return null;
	}

	if (testConfig.url && !Array.isArray(testConfig.url)) {
		testConfig.url = [testConfig.url];
	}

	return {
		...config,
		...testConfig,
		features: { ...config.features, ...(testConfig.features || {}) },
		testPath,
		entryFile,
		entryPart,
		entryFileExt: entryFile.split('.').pop(),
	};
}

const { yellow: yellow$1, green: green$1 } = chalk;

const isTest = getFlagEnv('TEST_ENV');
let initial = true;
let counter = 0;
let loadListener = null;
let browser, context;
let aboutpage = null;

/**
 * Opens a browser tab and injects all required styles and scripts to the DOM
 * @param {{url: string, assetBundle: Object} config
 * @param {Boolean} [singlePage]
 */
async function openPage(config, singlePage) {
	const { url: urls, assetBundle, onBefore, onLoad } = config;
	let url = getDefaultUrl(urls);
	let urlAfterLoad = url;

	const page = await getPage(config, singlePage);
	if (isOneOfBuildspecUrls(page.url(), urls)) {
		url = page.url();
	}

	// Remove previous listeners
	page.removeAllListeners();

	if (onBefore) {
		await onBefore(page);
	}

	const pageTags = [];

	if (assetBundle.js) pageTags.push('js');
	if (assetBundle.styles) pageTags.push('css');

	let text = initial ? 'Opening' : 'Reloading';

	if (!singlePage) {
		text = 'Opening';
	}

	if (!isTest) {
		console.log(
			...[`#${++counter}`, text, `page ${yellow$1(url)}`].concat(pageTags.length ? ['with custom:', pageTags] : [])
		);
	}
	if (isTest || config.debug) {
		page
			.on('console', (message) => console.log('LOG: ', message.text()))
			.on('pageerror', ({ message }) => console.log('ERR: ', message));
	}

	if (aboutpage) {
		await aboutpage.close();
		aboutpage = null;
	}

	if (initial) {
		await page.exposeFunction('isOneOfBuildspecUrls', isOneOfBuildspecUrls);
	}

	// Add listener for load event. Using event makes it possible to refresh the page and keep these updates.
	loadListener = async () => {
		try {
			await page.evaluate((urls) => {
				window.__testUrls = urls;
			}, urls);

			// Always listen the history state api
			if (!isTest && config.historyChanges) {
				await page.evaluate(
					(bundle, TEST_ID) => {
						function _appendVariantScripts() {
							setTimeout(() => {
								if (
									typeof window.isOneOfBuildspecUrls !== 'function' ||
									!window.isOneOfBuildspecUrls(location.href, window.__testUrls)
								) {
									return;
								}
								document.head.querySelectorAll(`[data-id="${TEST_ID}"]`).forEach((node) => node.remove());
								const node = document.createElement('script');
								node.dataset.id = TEST_ID;
								node.innerHTML = bundle;
								document.head.appendChild(node);
							}, 10);
						}

						function newHistoryChange(type) {
							var orig = history[type];
							return function () {
								var rv = orig.apply(this, arguments);
								var e = new Event('changestate');
								e.arguments = arguments;
								e.eventName = type;
								window.dispatchEvent(e);
								return rv;
							};
						}

						history.pushState = newHistoryChange('pushState');
						history.replaceState = newHistoryChange('replaceState');

						window.addEventListener('popstate', function (e) {
							_appendVariantScripts();
						});
						window.addEventListener('changestate', function (e) {
							_appendVariantScripts();
						});
					},
					assetBundle.bundle,
					process.env.TEST_ID
				);
			}

			// Check if the current url matches watched test urls.
			if (!initial && !isOneOfBuildspecUrls(page.url(), urls)) {
				return;
			}

			if (config.activationEvent) {
				await page.evaluate(
					(bundle, activationEvent, pageTags, TEST_ID) => {
						function _appendVariantScripts() {
							console.log('\x1b[92m%s\x1b[0m', 'AB test loaded.\nInserted following assets:', pageTags.join(', '));
							document.head.querySelectorAll(`[data-id="${TEST_ID}"]`).forEach((node) => node.remove());
							const node = document.createElement('script');
							node.dataset.id = TEST_ID;
							node.innerHTML = bundle;
							document.head.appendChild(node);
						}

						function _alterDataLayer(dataLayer) {
							console.log('\x1b[92m%s\x1b[0m', 'Added dataLayer listener for', activationEvent);
							const oldPush = dataLayer.push;
							dataLayer.push = function (...args) {
								args.forEach(({ event }) => {
									if (event === activationEvent) {
										_appendVariantScripts();
									}
								});
								oldPush.apply(dataLayer, args);
							};
						}

						if (!window.dataLayer) {
							window.dataLayer = [];
						}
						_alterDataLayer(window.dataLayer);
					},
					assetBundle.bundle,
					config.activationEvent,
					pageTags,
					process.env.TEST_ID
				);
			} else {
				try {
					const scriptTag = await page.addScriptTag({ content: assetBundle.bundle });
					await page.evaluate(
						(script, TEST_ID) => {
							script.dataset.id = TEST_ID;
						},
						scriptTag,
						process.env.TEST_ID
					);
				} catch (error) {
					console.log(error.message);
				}
				if (!isTest) {
					await page.evaluate((pageTags) => {
						console.log('\x1b[92m%s\x1b[0m', 'AB test loaded.\nInserted following assets:', pageTags.join(', '));
					}, pageTags);
				}
			}

			if (isTest) {
				page.off('domcontentloaded', loadListener);
				loadListener = null;
			}
		} catch (error) {
			console.log(error.message);
		}
	};

	page.on('domcontentloaded', loadListener);

	await page.goto(url, { waitUntil: 'networkidle0' });

	if (onLoad) {
		await onLoad(page);
	}

	initial = false;
	// There might be some redirect/hash/etc
	urlAfterLoad = page.url();

	// Push the changed url to the list of watched urls.
	if (!isOneOfBuildspecUrls(urlAfterLoad, urls)) {
		urls.push(urlAfterLoad);
		// Update the test urls array in window for history statechange event.
		await page.evaluate((urls) => {
			window.__testUrls = urls;
		}, urls);
	}

	return page;
}

/**
 * @param {string} url
 * @param {string[]} urls
 * @returns {boolean}
 */
function isOneOfBuildspecUrls(url, urls = []) {
	return Boolean(
		urls.find((cur) => {
			if (url === cur) {
				return true;
			}
			if (typeof cur === 'string' && cur[0] === '/' && cur[cur.length - 1] === '/') {
				const re = new RegExp(cur.substr(1, cur.length - 2));
				return re.test(url);
			}
			return false;
		})
	);
}

function getDefaultUrl(urls) {
	const url = urls.find((cur) => {
		// Check regex types
		if (typeof cur === 'string' && cur[0] === '/' && cur[cur.length - 1] === '/') {
			return false;
		}
		return true;
	});
	if (!url) {
		console.error('No proper default URL found. RegExp URL cannot be the default URL.');
		console.error('Buildspec URLs:');
		console.error(yellow$1(urls.join('\n')));
		process.exit();
	}
	return url;
}

/**
 * @param {Object} config
 * @returns {Promise<import("puppeteer").Browser>}
 */
async function getBrowser(config = {}) {
	// Test environment.
	if (global.__BROWSER__) {
		browser = global.__BROWSER__;
	}

	// Setup puppeteer
	if (!browser) {
		console.log(green$1('Starting browser...'));
		if (config.debug) {
			console.log('With config:');
			console.log(config);
		}
		console.log();

		browser = await puppeteerCore.launch({
			headless: Boolean(config.headless),
			devtools: Boolean(config.devtools),
			executablePath: config.browser,
			userDataDir: config.userDataDir || undefined,
			defaultViewport: null,
			ignoreDefaultArgs: ['--disable-extensions'],
			args: [`--window-size=${config.windowSize[0]},${config.windowSize[1]}`, '--incognito'],
		});

		aboutpage = (await browser.pages())[0];
		aboutpage.evaluate(
			() =>
				(document.body.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="margin: auto; background: rgb(255, 255, 255); display: block;" width="200px" height="200px" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid">
			<path fill="none" stroke="#93dbe9" stroke-width="8" stroke-dasharray="42.76482137044271 42.76482137044271" d="M24.3 30C11.4 30 5 43.3 5 50s6.4 20 19.3 20c19.3 0 32.1-40 51.4-40 C88.6 30 95 43.3 95 50s-6.4 20-19.3 20C56.4 70 43.6 30 24.3 30z" stroke-linecap="round" style="transform:scale(0.8);transform-origin:50px 50px">
				<animate attributeName="stroke-dashoffset" repeatCount="indefinite" dur="1s" keyTimes="0;1" values="0;256.58892822265625"></animate>
			</path>
			</svg>`)
		);

		browser.on('disconnected', () => {
			process.exit(0);
		});
	}

	if (!context) {
		context = await browser.createIncognitoBrowserContext();
	}

	return browser;
}

let page;

/**
 * Return a puppeteer page. If there's no page created then this also creates the page.
 * @param {Object} config
 * @param {Boolean} singlePage
 * @returns {Promise<import("puppeteer").Page>}
 */
async function getPage(config, singlePage) {
	if (singlePage && page) {
		return page;
	}

	const browser = await getBrowser(config);

	let newPage;
	if (singlePage) {
		page = newPage = (await browser.pages())[0];
		aboutpage = null;
	} else {
		newPage = await context.newPage();
	}

	if (config.debug) {
		newPage.on('console', (msg) => {
			console.log(msg.text());
		});
	}

	newPage.on('pageerror', (pageerr) => {
		console.log('\n\x1b[31m%s\x1b[0m', 'Page error!');
		console.error(pageerr);
	});

	await newPage.setDefaultNavigationTimeout(0);

	return newPage;
}

const defaults = {
	size: 150,
	exclude: null,
	include: null,
};

const mimeTypes = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
};

/**
 * Rollup plugin that splits image plugin output base64 string into multiple chunks.
 * Google Tag Manager has a validator in HTML tags that checks that there are not too many contiguous non-whitespace characters.
 *
 * @param {typeof defaults} opts
 */
function chunkImage(opts = {}) {
	if (opts === true) {
		opts = {};
	} else if (typeof opts === 'number') {
		opts = { size: opts };
	}

	const options = Object.assign({}, defaults, opts);
	const filter = pluginutils.createFilter(options.include, options.exclude);

	const parentName = 'image';

	return {
		name: 'chunk-image',

		buildStart({ plugins }) {
			const parentPlugin = plugins.find((plugin) => plugin.name === parentName);
			if (!parentPlugin) {
				// or handle this silently if it is optional
				throw new Error(`This plugin depends on the "${parentName}" plugin.`);
			}
		},

		transform: function transform(/** @type {string}*/ code, id) {
			// Disabled by config?
			if (opts === false) {
				return null;
			}

			if (!filter(id)) {
				return null;
			}

			let mime = mimeTypes[path.extname(id)];
			if (!mime) {
				// not an image
				return null;
			}

			// Skip all other output types than string constants (for now)
			if (code.indexOf('const img = "data:') !== 0) {
				return null;
			}

			const firstQuot = code.indexOf('"') + 1;
			const lastQuot = code.indexOf('"', firstQuot);
			const start = code.substr(0, firstQuot);
			const end = code.substr(lastQuot);
			const parts = code
				.replace(start, '')
				.replace(end, '')
				.match(new RegExp(`[^]{1,${options.size}}`, 'g'));

			return start + parts.join('" + "') + end;
		},
	};
}

/**
 * Enables preact debug module. This plugin is required because there's another plugin that
 * automatically imports h & Fragment and debug module must be imported before them.
 */
function preactDebug() {
	return {
		name: 'preact-debug',
		async resolveId(source, importer) {
			// Is root level import?
			if (!importer) {
				// We need to skip this plugin to avoid an infinite loop
				const resolution = await this.resolve(source, undefined, { skipSelf: true });
				// If it cannot be resolved, return `null` so that Rollup displays an error
				if (!resolution) return null;
				return resolution;
			}
			return null;
		},
		load(id) {
			// Prepend preact debug module to the imported code
			if (!getFlagEnv('TEST_ENV') && this.getModuleInfo(id).isEntry && getFlagEnv('PREACT') && getFlagEnv('PREVIEW')) {
				const contents = readFileSync(id).toString();
				return `import "preact/devtools";\n${contents};`;
			}
			return null;
		},
	};
}

// __dirname is not defined in ES module scope
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const browsers = browserslist();

const supportIE = !!browsers.find((b) => b.startsWith('ie'));

const rootDir = __dirname.replace(/(\/|\\)(dist|bin|lib).*/, '');

async function bundler(testConfig) {
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
	const minify$1 = configMinify ?? !watch;

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
						minimize: minify$1,
						modules:
							modules !== false
								? {
										generateScopedName: minify$1
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
		intro: minify$1 ? 'const window = self; const document = window.document;' : '',
		plugins: [
			minify$1 &&
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
			amd = await minify(
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
				"})();";
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

		assetBundle = await createAssetBundle();

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

		watcher = watch$1(watcherConfig);

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
				assetBundle = await createAssetBundle();
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

const { cyan, yellow, green, red } = chalk;

const cmd = process.argv[2];

const cmds = ['watch', 'build', 'preview', 'build-all', 'screenshot'];

if (!cmds.includes(cmd)) {
	console.log('Unsupported command: ' + cmd);
	console.log('Supported commands are: ' + cmds.join(', '));
	process.exit();
}

const watch = cmd === 'watch';

let rollupWatcher = null;

const targetPath = process.argv[3] || '.';

const cmdArgs = minimist(process.argv.slice(3), {
	boolean: ['build'],
	alias: {
		b: 'build',
		u: 'url',
		n: 'name',
	},
});

// More graceful exit
process.on('SIGINT', () => {
	console.log('');
	process.exit();
});

switch (cmd) {
	case 'watch':
	case 'build':
		buildSingleEntry(targetPath);
		break;
	case 'preview':
	case 'build-all':
		buildMultiEntry(targetPath);
		break;
	case 'screenshot':
		createScreenshots(targetPath);
		break;
	default:
		process.exit();
}

/**
 * Builds a bundle for commands that have single matching entry.
 * @param {string} targetPath
 */
async function buildSingleEntry(targetPath) {
	const [config] = await getMatchingBuildspec(targetPath);

	if (!config) {
		console.log(red("Couldn't find buildspec.json for the variant", targetPath));
		process.exit();
	}

	switch (cmd) {
		case 'watch':
			if (rollupWatcher) {
				rollupWatcher.close();
			} else {
				console.log(cyan('Starting bundler with a file watcher...'));
			}
			const watcher = chokidar.watch(config._specFiles, {
				awaitWriteFinish: true,
			});
			watcher.on('change', (filepath) => {
				console.log('');
				console.log('Buildspec changed', yellow(filepath));
				console.log(green('Restarting bundler...'));
				console.log('');
				buildSingleEntry(targetPath);
				watcher.close();
			});
			break;
		case 'build':
			console.log(cyan('Building variant bundle...'));
			break;
	}

	console.log('Entry:', yellow(config.entryFile));
	console.log('');

	try {
		const output = await bundler({ ...config, watch });
		rollupWatcher = output.watcher;
		if (!watch) {
			console.log(green('Bundle built.'));
		}
		console.log('');
	} catch (error) {
		console.log(error);
	}
}

/**
 * Builds a bundle for commands that may have multiple matching entries.
 * @param {string} targetPath
 */
async function buildMultiEntry(targetPath) {
	const buildOnly = cmd === 'build-all';
	const buildspecs = await getMatchingBuildspec(targetPath);
	const [testConfig] = buildspecs;

	if (!testConfig) {
		console.log("Couldn't find any variant files");
		process.exit();
	}

	switch (cmd) {
		case 'preview':
			console.log(cyan('Starting bundlers for preview...'));
			break;
		case 'build-all':
			console.log(cyan('Building all variant bundles...'));
			break;
	}

	console.log();

	try {
		if (!buildOnly) {
			await getBrowser(testConfig);
		}

		for (const buildspec of buildspecs) {
			const { entryFile } = buildspec;
			const output = await bundler(buildspec);
			if (!buildOnly) {
				await openPage(output);
			} else {
				console.log(entryFile.replace(process.env.INIT_CWD, ''), green('Done.'));
			}
		}

		if (buildOnly) {
			console.log();
			console.log(green('Variant bundles built.'));
			console.log();
			process.exit(0);
		}
	} catch (e) {
		console.log(e);
		// Do nothing
	}
}

/**
 * Creates screenshots from variants that matches the given path.
 * @param {string} targetPath
 */
async function createScreenshots(targetPath) {
	const buildspecs = await getMatchingBuildspec(targetPath);

	const { url: cmdArgUrl, name, ...screenshotArgs } = cmdArgs;
	let cmdArgBuild = false;
	if ('build' in screenshotArgs) {
		cmdArgBuild = true;
		delete screenshotArgs.build;
	}

	if (!buildspecs.length) {
		console.log(red('0 test variants found with path:'));
		console.log(targetPath);
		process.exit();
	}

	let origPage;

	console.log(cyan(`Taking screenshots`));
	console.log();

	for (const config of buildspecs) {
		const nth = buildspecs.indexOf(config) + 1;
		if (cmdArgUrl) {
			if (isNaN(cmdArgUrl)) {
				config.url = [cmdArgUrl];
			} else {
				if (Array.isArray(config.url)) {
					const urlIndex = +cmdArgUrl;
					if (urlIndex < config.url.length) {
						config.url = [config.url[urlIndex]];
					} else {
						console.log(yellow(`Undefined index for test config url. Argument was`), '--url=' + cmdArgUrl);
						console.log(yellow(`Current config`), config.url);
					}
				} else {
					console.log(
						yellow(`Test config url wasn't an array, can't use indexed url argument. Argument was`),
						'--url=' + cmdArgUrl
					);
				}
			}
		}
		const { testPath, buildDir, entryFile, entryFileExt, screenshot = {}, onLoad, onBefore } = config;

		Object.assign(screenshot, screenshotArgs);

		let {
			waitFor,
			waitForOptions = {},
			onLoad: screenshotOnLoad,
			onBefore: screenshotOnBefore,
			...pptrScreenshotOptions
		} = screenshot;
		const entryName = path.basename(entryFile, '.' + entryFileExt);

		// Bundle main events and screenshot events
		const singleOnLoad = async (page) => {
			if (onLoad) await onLoad(page);
			if (screenshotOnLoad) await screenshotOnLoad(page);
		};

		const singleOBefore = async (page) => {
			if (onBefore) await onBefore(page);
			if (screenshotOnBefore) await screenshotOnBefore(page);
		};

		const bundleConfig = { ...config, onLoad: singleOnLoad, onBefore: singleOBefore, preview: true };

		if (!cmdArgBuild) {
			const bundlePath = path.join(testPath, buildDir, `${entryName}.bundle.js`);
			if (lstatSync(bundlePath).isFile()) {
				bundleConfig.assetBundle = {
					bundle: readFileSync(bundlePath).toString(),
				};
			}
		}

		const output = bundleConfig.assetBundle ? bundleConfig : await bundler(bundleConfig);

		console.log(cyan(`Creating a bundle for screenshot`), entryFile);
		console.log();

		const page = await openPage({ ...output, headless: true, devtools: false });
		const url = Array.isArray(config.url) ? config.url[0] : config.url;

		const waitForAll = async (page) => {
			if (typeof waitFor === 'string') {
				console.log(cyan(`Waiting for selector ${waitFor}...`));
				await page.waitForSelector(waitFor, waitForOptions);
			}
			if (typeof waitFor === 'number') {
				console.log(cyan(`Waiting for timeout ${waitFor} ms...`));
				await page.waitForTimeout(waitFor, waitForOptions);
			}
			if (typeof waitFor === 'function') {
				console.log(cyan(`Waiting for function...`));
				await page.waitForFunction(waitFor, waitForOptions);
			}
		};

		if (pptrScreenshotOptions.fullPage === undefined) {
			pptrScreenshotOptions.fullPage = true;
		}
		if (pptrScreenshotOptions.clip) {
			pptrScreenshotOptions.fullPage = false;
		}

		await waitForAll(page);

		// Take screenshot from variant
		await page.screenshot({
			...pptrScreenshotOptions,
			path: path.join(config.testPath, config.buildDir, `screenshot-${path.basename(name || entryName)}-v${nth}.png`),
		});

		console.log(cyan(`Screenshot ready`), `${entryFile}, variant ${nth}`);

		// Get new page for the original (without listeners etc)
		origPage = await page.browser().newPage();

		await singleOBefore(origPage);

		// Go to the same url and take the screenshot from the original as well.
		await origPage.goto(url, { waitUntil: 'networkidle0' });

		await singleOnLoad(origPage);

		await waitForAll(origPage);

		await origPage.screenshot({
			...pptrScreenshotOptions,
			path: path.join(config.testPath, config.buildDir, `screenshot-${path.basename(name || entryName)}-orig.png`),
		});

		console.log(cyan(`Screenshot ready`), `${entryFile}, original`);
		console.log();

		console.log(green('Took screenshots for'), entryFile.replace(process.env.INIT_CWD, ''));
		console.log();
	}

	console.log(green('Done.'));
	if (origPage) {
		await origPage.browser().close();
	}
}

/**
 * Returns all entry buildspecs that matches the given path.
 * @param {string} targetPath
 * @return {Object[]}
 */
async function getMatchingBuildspec(targetPath) {
	let indexFiles = [];

	targetPath = path.resolve(process.env.INIT_CWD, targetPath);

	if (lstatSync(targetPath).isFile()) {
		indexFiles = indexFiles.concat(targetPath);
	}

	if (!indexFiles.length) {
		const files = readdirSync(targetPath, { encoding: 'utf8' });
		indexFiles = indexFiles.concat(
			targetPath,
			files.map((file) => path.join(targetPath, file)).filter((path) => lstatSync(path).isDirectory())
		);
	}

	const entries = await Promise.all(
		indexFiles.map(async (entryFile) => {
			const filter = createFilter([/\.(jsx?|tsx?|(le|sa|sc|c)ss)$/]);
			if (entryFile.includes('.build')) {
				return null;
			}
			if (!filter(entryFile) && !lstatSync(entryFile).isDirectory()) {
				return null;
			}
			const spec = await buildspec(entryFile);
			if (spec && new RegExp(`${spec.buildDir}(/|$)`).test(entryFile)) {
				return null;
			}
			return spec;
		})
	);

	return entries.filter(Boolean);
}

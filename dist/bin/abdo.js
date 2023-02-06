#!/usr/bin/env node
import chalk from 'chalk';
import chokidar from 'chokidar';
import minimist from 'minimist';
import path from 'node:path';
import { createFilter } from '@rollup/pluginutils';
import fs, { readFileSync, lstatSync, readdirSync } from 'node:fs';
import get from 'lodash.get';
import set from 'lodash.set';
import merge from 'lodash.merge';
import { createRequire } from 'node:module';
import basicSsl, { getCertificate } from '@vitejs/plugin-basic-ssl';
import puppeteerCore from 'puppeteer-core';
import crypto from 'node:crypto';
import replace from '@rollup/plugin-replace';
import svgr from 'vite-plugin-svgr';
import browserslist from 'browserslist';
import stringHash from 'string-hash';
import { URL, fileURLToPath } from 'node:url';
import { build, createServer } from 'vite';
import prefresh from '@prefresh/vite';
import { transformSync } from '@babel/core';
import prefreshBabelPlugin from '@prefresh/babel-plugin';

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

/**
 * @param {string} path
 * @returns {string}
 */
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
	chunks: false,
	devtools: true,
	historyChanges: true,
	modules: true,
	preact: false,
	sourcemap: true,
	watch: false,
	windowSize: [1920, 1080],
	toolbar: false,
	extractCss: false,
	features: {
		hooks: true,
		jsx: true,
		className: true,
		classComponent: true,
		namespace: true,
		extendedVnode: true,
	},
};

/**
 * @param {string} configPath
 * @returns {object | () => object}
 */
async function getConfigFileJsonOrJSContent(configPath) {
	const fileDir = path.dirname(configPath);
	const fileWithoutExt = path.basename(configPath, '.json');
	const configPathJs = path.resolve(fileDir, `${fileWithoutExt}.js`);
	if (fs.existsSync(configPath)) {
		// Clear require cache before loading the file
		delete specRequire.cache[configPath];
		return { file: configPath, config: specRequire(configPath) };
	} else if (fs.existsSync(configPathJs)) {
		// Import file with a cache buster
		const { default: configMod } = await import(
			`${convertToEsmPath(configPathJs)}?cb=${Math.random().toString(36).substring(3)}`
		);
		return { file: configPathJs, config: configMod };
	}
	return {};
}

/**
 * @param  {...string[]} specConfigPaths
 * @returns {Promise<Array<{file: string, config: object}>}
 */
async function getValidatedSpecs(...specConfigPaths) {
	const specs = await Promise.all(
		specConfigPaths.map(async (configPath) => {
			const specConfig = await getConfigFileJsonOrJSContent(configPath);
			if (!Object.keys(specConfig).length || !['function', 'object'].includes(typeof specConfig.config)) {
				return;
			}
			return {
				...specConfig,
				config: typeof specConfig.config === 'function' ? specConfig() : specConfig.config,
			};
		})
	);
	return specs.filter(Boolean);
}

/**
 * Returns a build spec object for given test path
 * @param {string} testPath
 */
async function getBuildSpec(testPath) {
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
	const testConfig = {
		specs: [],
	};

	try {
		testConfig.specs = await getValidatedSpecs(
			path.resolve(process.cwd(), 'config.json'),
			path.join(testPath, '..', '..', 'buildspec.json'),
			path.join(testPath, '..', 'buildspec.json'),
			path.join(testPath, 'buildspec.json')
		);
	} catch (error) {
		console.error(error);
	}

	// Empty config object or the buildspec.json is missing
	if (!testConfig.specs.length) {
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

	const overrideConfig = {
		...config,
		...testConfig,
	};

	return {
		...overrideConfig,
		features: {
			...config.features,
			...(testConfig.features || {}),
			...(overrideConfig.preact ? { jsx: false, hooks: false } : {}),
		},
		testPath,
		entryFile,
		entryPart,
		entryFileExt: entryFile.split('.').pop(),
		getSpecConfig(options) {
			return testConfig.specs.reduce(
				(acc, spec) => {
					Object.keys(spec.config).forEach((key) => {
						if (key === 'bundler') return;
						const option = spec.config[key];
						const accVal = get(acc, [key]);
						if (typeof option === 'function') {
							set(acc, [key], option(accVal));
						} else if (Array.isArray(accVal)) {
							accVal.concat(option);
						} else if (typeof option === 'object' && option && !Array.isArray(option)) {
							set(acc, [key], merge(accVal, option));
						} else {
							set(acc, [key], option);
						}
					});
					if (acc.url && !Array.isArray(acc.url)) {
						acc.url = [acc.url];
					}
					return acc;
				},
				{ ...options }
			);
		},
		getBundlerConfig(config) {
			return testConfig.specs.reduce(
				(acc, spec) => {
					const bundlerConfig = get(spec, ['config', 'bundler']);
					if (bundlerConfig) {
						Object.keys(bundlerConfig).forEach((key) => {
							const option = bundlerConfig[key];
							const accVal = get(acc, [key]);
							if (typeof option === 'function') {
								set(acc, [key], option(accVal));
							} else if (Array.isArray(accVal)) {
								accVal.concat(option);
							} else if (typeof option === 'object' && option && !Array.isArray(option)) {
								set(acc, [key], merge(accVal, option));
							} else {
								set(acc, [key], option);
							}
						});
					}
					return acc;
				},
				{ ...config }
			);
		},
	};
}

// import { injectToolbar } from './utils/toolbar/pptr-toolbar';

const { yellow: yellow$1, green } = chalk;

const isTest = getFlagEnv('TEST_ENV');
let initial = true;
let counter = 0;
let loadListener = null;
let browser, context;
let aboutpage = null;
let disabled = false;

/**
 * Opens a browser tab and injects all required styles and scripts to the DOM
 * @param {url: string, assetBundle: Object} config
 * @param {Boolean} [singlePage]
 */
async function openPage(config, singlePage) {
	const { url: urls, assetBundle, onBefore, onLoad } = config;
	let url = getDefaultUrl(urls);
	let urlAfterLoad = url;

	const wasInitial = initial;
	if (initial) {
		initial = false;
	}

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

	let text = wasInitial ? 'Opening' : 'Reloading';

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

	if (wasInitial) {
		await page.exposeFunction('isOneOfBuildspecUrls', isOneOfBuildspecUrls);

		await page.exposeFunction('takeScreenshot', async (fullPage = true) => {
			await page.evaluate(() => {
				const toolbar = document.getElementById('a-b-toolbar');
				if (toolbar) {
					toolbar.style.display = 'none';
				}
			});

			await page.screenshot({
				fullPage,
				path: path.join(
					config.buildDir,
					`screenshot-${new Date()
						.toISOString()
						.replace('T', '-')
						.replace(/[^0-9-]/g, '')}.png`
				),
			});

			await page.evaluate(() => {
				const toolbar = document.getElementById('a-b-toolbar');
				if (toolbar) {
					toolbar.style.display = 'block';
				}
			});
		});

		await page.exposeFunction('toggleInjection', () => {
			disabled = !disabled;
		});
	}

	// Add listener for load event. Using event makes it possible to refresh the page and keep these updates.
	loadListener = async () => {
		try {
			await page.evaluate((urls) => {
				window.__testUrls = urls;
			}, urls);

			if (!isTest) {
				await page.evaluate(
					(TEST_ID, testPath, config) => {
						window.abPreview = {
							testId: TEST_ID,
							config,
							testPath,
						};
					},
					process.env.TEST_ID,
					config.testPath.replace(process.cwd(), ''),
					config
				);
			}

			if (disabled) {
				return;
			}

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
			if (!wasInitial && !isOneOfBuildspecUrls(page.url(), urls)) {
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

	await page.goto(url, { waitUntil: 'networkidle2' });

	if (onLoad) {
		await onLoad(page);
	}

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
			// Check also with trailing slash in domain
			if (url === cur.replace(/(\.[a-z]{2})\?/, '$1/?')) {
				return true;
			}
			// Ignore http/https protocol difference
			if (url === cur.replace('http://', 'https://')) {
				return true;
			}
			if (typeof cur === 'string' && cur[0] === '/' && cur[cur.length - 1] === '/') {
				const re = new RegExp(cur.substring(1, cur.length - 2));
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
		console.log(green('Starting browser...'));
		if (config.debug) {
			console.log('With config:');
			console.log(config);
		}

		// Load the self-signed cert and create a SPKI fingerprint from it for Chrome so it won't nag about invalid cert
		const cert = await getCertificate('node_modules/.vite/basic-ssl');
		const pubKeyObject = crypto.createPublicKey(cert, {
			type: 'pkcs1',
			format: 'pem',
		});
		const publicKeyDer = pubKeyObject.export({
			type: 'spki',
			format: 'der',
		});
		const fingerprint = crypto.createHash('sha256').update(publicKeyDer).digest('base64');

		browser = await puppeteerCore.launch({
			headless: Boolean(config.headless),
			devtools: Boolean(config.devtools),
			executablePath: config.browser,
			userDataDir: config.userDataDir || undefined,
			defaultViewport: null,
			ignoreDefaultArgs: ['--disable-extensions'],
			args: [
				`--window-size=${config.windowSize[0]},${config.windowSize[1]}`,
				'--incognito',
				`--ignore-certificate-errors-spki-list=${fingerprint}`,
			].concat(config.browserArgs || []),
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

	/** @type {Promise<import("puppeteer").Page>}*/
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

/**
 * Enables preact debug module. This plugin is required because there's another plugin that
 * automatically imports h & Fragment and debug module must be imported before them.
 */
function preactDebug() {
	let entry = '';
	let config = {};

	return {
		name: 'a-b-doer:preact-debug',
		enforce: 'pre',
		configResolved(resolvedConfig) {
			config = resolvedConfig;
		},
		resolveId(id, importer) {
			if (!importer && !entry) {
				entry = id;
			}
		},
		transform(code, id) {
			if (entry === id && config.command === 'serve') {
				code = `import "preact/devtools";\n${code};`;
			}
			return code;
		},
	};
}

function cssInjectedByJsPlugin() {
	let cssToInject = '';
	let config;

	return {
		apply: 'build',
		enforce: 'post',
		name: 'a-b-doer:css-in-js-plugin',
		configResolved(_config) {
			config = _config;
		},
		async generateBundle(opts, bundle) {
			const { abConfig } = config;

			const bundleKeys = Object.keys(bundle);
			const cssAssets = bundleKeys.filter((i) => bundle[i].type == 'asset' && bundle[i].fileName.endsWith('.css'));
			const jsAssets = bundleKeys.filter(
				(i) =>
					bundle[i].type == 'chunk' &&
					bundle[i].fileName.match(/.[cm]?js$/) != null &&
					!bundle[i].fileName.includes('polyfill')
			);

			// Support style entries
			if (!jsAssets[0] && bundleKeys[0] && abConfig.stylesOnly) {
				// With styles only and extract css, remove the js main chunk
				if (abConfig.extractCss) {
					delete bundle[bundleKeys[0]];
				}
				// Create a proper javascript file from the css chunk
				else {
					const newKey = path.basename(bundleKeys[0], '.css') + '.js';
					bundle[newKey] = bundle[bundleKeys[0]];
					bundle[newKey].fileName = newKey;
					delete bundle[bundleKeys[0]];
					jsAssets[0] = newKey;
				}
			}

			if (!abConfig.extractCss) {
				const allCssCode = cssAssets.reduce((previousValue, cssName) => {
					const cssAsset = bundle[cssName];
					const result = previousValue + cssAsset.source;
					delete bundle[cssName];
					return result;
				}, '');

				if (allCssCode.length > 0) {
					cssToInject = allCssCode;
				}

				if (cssToInject) {
					const jsAsset = bundle[jsAssets[0]];

					const appCode = jsAsset.code;
					jsAsset.code =
						/* prettier-ignore */
						"!(function(){" +
						"var __a,__s,__f=function(){" +
							"if(__a){return;}" +
							"__a=1;" +
							"__s=document.createElement('style');__s.dataset.id='"+abConfig.TEST_ID+"',__s.innerHTML='" +
							cssToInject.replace(/([\r\n\s]+)/g, ' ').replace(/'/g, "\\'") +
							"';" +
							"document.head.appendChild(__s);" +
						"};" +
						(abConfig.appendStyles ? "__f();" : "window._addStyles=__f;") +
					"})();"
					+ appCode;
				}
			}
		},
	};
}

/**
 * Plugin that enables style modules to all style files if A/B doer configuration setting `modules` is enabled
 */
function cssModules() {
	let config;

	const cssLangs = `\\.(css|less|sass|scss|styl|stylus|pcss|postcss|sss)($|\\?)`;
	const cssLangRE = new RegExp(cssLangs);
	const cssLangModuleRE = new RegExp(`\\.module${cssLangs}`);
	const isCSSRequest = (request) => cssLangRE.test(request);
	const isCSSModuleRequest = (request) => cssLangModuleRE.test(request);

	const modules = new Map();

	return {
		enforce: 'pre',
		name: 'a-b-doer:css-modules',
		configResolved(_config) {
			config = _config;
		},
		async resolveId(source, importer, options) {
			const convertToModule =
				!isCSSModuleRequest(source) &&
				isCSSRequest(source) &&
				(config.abConfig.modules || (typeof config.abConfig.modules === 'function' && config.abConfig.modules(source)));

			if (convertToModule) {
				const resolution = await this.resolve(source, importer, { skipSelf: true, ...options });
				if (resolution?.id) {
					const parts = resolution.id.split('.');
					const ext = parts.pop();
					const newId = parts.join('.') + '.module.' + ext;
					modules.set(newId, resolution.id);
					return newId;
				}
			}
		},
		load(id) {
			const info = this.getModuleInfo(id);
			if (info?.id) {
				const idPath = info.id.startsWith(config.abConfig.libDir)
					? info.id
					: path.join(config.abConfig.libDir, info.id);
				const realID = info && modules.get(idPath);
				if (realID) {
					return readFileSync(realID, { encoding: 'utf-8' }).toString();
				}
			}
		},
	};
}

/** @returns {import('vite').Plugin} */
function customJsxPrefreshPlugin(options = {}) {
	const __filename = new URL('', import.meta.url).pathname;

	let shouldSkip = false;
	const filter = createFilter(options.include, options.exclude);
	let config = {};

	return {
		name: 'a-b-doer:prefresh',
		configResolved(_config) {
			config = _config;
			shouldSkip = config.command === 'build' || config.isProduction;
		},
		async transform(code, id, options) {
			if (shouldSkip || !/\.(t|j)sx?$/.test(id) || id.includes('node_modules') || id.includes('?worker') || !filter(id))
				return;

			const parserPlugins = [
				'jsx',
				'classProperties',
				'classPrivateProperties',
				'classPrivateMethods',
				/\.tsx?$/.test(id) && 'typescript',
				...(options.parserPlugins || []),
			].filter(Boolean);

			const result = transform(code, id, parserPlugins);
			const hasReg = /\$RefreshReg\$\(/.test(result.code);
			const hasSig = /\$RefreshSig\$\(/.test(result.code);

			if (!hasSig && !hasReg) return code;

			const prefreshCore = await this.resolve('@prefresh/core', __filename);

			const prelude = `
        ${'import'} ${JSON.stringify(prefreshCore.id)};
        ${'import'} { flush as flushUpdates } from "${path.join(
				config.abConfig.libDir,
				'lib',
				'plugins',
				'custom-prefresh-utils.js'
			)}";

        let prevRefreshReg;
        let prevRefreshSig;

        if (import.meta.hot) {
          prevRefreshReg = self.$RefreshReg$ || (() => {});
          prevRefreshSig = self.$RefreshSig$ || (() => (type) => type);

          self.$RefreshReg$ = (type, id) => {
            self.__PREFRESH__.register(type, ${JSON.stringify(id)} + " " + id);
          };

          self.$RefreshSig$ = () => {
            let status = 'begin';
            let savedType;
            return (type, key, forceReset, getCustomHooks) => {
              if (!savedType) savedType = type;
              status = self.__PREFRESH__.sign(type || savedType, key, forceReset, getCustomHooks, status);
              return type;
            };
          };
        }
        `.replace(/[\n]+/gm, '');

			if (hasSig && !hasReg) {
				return {
					code: `${prelude}${result.code}`,
					map: result.map,
				};
			}

			return {
				code: `${prelude}${result.code}
        if (import.meta.hot) {
          self.$RefreshReg$ = prevRefreshReg;
          self.$RefreshSig$ = prevRefreshSig;
          import.meta.hot.accept((m) => {
            try {
              flushUpdates();
            } catch (e) {
              self.location.reload();
            }
          });
        }
      `,
				map: result.map,
			};
		},
	};
}

const transform = (code, path, plugins) =>
	transformSync(code, {
		plugins: [[prefreshBabelPlugin, { skipEnvCheck: true }]],
		parserOpts: {
			plugins,
		},
		ast: false,
		sourceMaps: true,
		sourceFileName: path,
		configFile: false,
		babelrc: false,
	});

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

const minifiedProperties = {
	__hooks: 'h',
	__class: 'c',
	__vnode: 'v',
	__current: 'i',
	__state: 's',
	__dirty: 'd',
	__children: 'a',
	__result: 'r',
	__dom: 'e',
	__delete: 'x',
};

/**
 * @param {Awaited<ReturnType<import("./buildspec").default>>} buildSpecConfig
 * @returns {object} Bundler config
 */
function getBundlerConfigs(buildSpecConfig) {
	let { getBundlerConfig = (opts) => opts, getSpecConfig = (opts) => opts, ...restConfig } = buildSpecConfig;

	const testConfig = getSpecConfig({ ...defaultConfig, ...restConfig });

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

	const { minify: configMinify, preact, modules, id, chunks, watch, features } = testConfig;
	const minify = configMinify ?? !watch;

	// Bundler behaves a little bit differently when there's style file as an entry.
	let stylesOnly = /\.(le|sa|sc|c)ss$/.test(entryFile);

	if (!entryFile) {
		throw new Error("Couldn't find entry file");
	}

	// Get parsed boolean values from some common process.env variables
	const PREACT = getFlagEnv('PREACT') ?? !!preact;
	const NODE_ENV = JSON.stringify(watch ? 'development' : 'production');
	const IE = getFlagEnv('IE') ?? supportIE;
	const PREVIEW = Boolean(watch || preview);
	const TEST_ENV = getFlagEnv('TEST_ENV') || false;
	const TEST_ID = id || `t${hashf(path.dirname(unifyPath(entryFile))).toString(36) || '-default'}`;
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
			featuresReplaces[`config.${key}`] = value.toString();
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
		: {
				format: 'iife',
		  };

	// const outputOptions = {};

	const jsxInject = preact
		? 'import {h,Fragment} from "preact"'
		: `import {h,hf} from "${path.join(rootDir, '/src/jsx')}"`;

	const optimizeDeps = {
		exclude: [`@prefresh/vite/runtime`, `@prefresh/vite/utils`],
	};

	const bundlerConfig = getBundlerConfig({
		abConfig: {
			...testConfig,
			TEST_ID,
			stylesOnly,
			libDir: rootDir,
		},
		optimizeDeps: stylesOnly
			? {
					...optimizeDeps,
					entries: [entryFile],
			  }
			: optimizeDeps,
		esbuild: {
			jsx: 'transform',
			jsxFactory: 'h',
			jsxFragment: preact ? 'Fragment' : 'hf',
			jsxInject,
		},
		css: {
			modules: modules && {
				generateScopedName: (name, file, css) => {
					const hash = stringHash(unifyPath(file + css))
						.toString(36)
						.substring(0, 5);
					if (minify) {
						return `t${hash}-${name}`;
					}
					const folder = path.basename(path.dirname(file));
					const fileNameParts = path.basename(file).split('.').slice(0, -1);
					if (fileNameParts.at(-1) === 'module') fileNameParts.pop();
					return `t_${folder}_${fileNameParts.join('.')}_${name}__${hash}`;
				},
			},
		},
		build: {
			lib: {
				name: 'entryPart',
				entry: [entryFile],
				formats: [chunksOuputConfig.format],
				fileName: () => getFileAs(path.basename(entryFile), stylesOnly ? 'css' : 'js'),
			},
			minify: minify ? 'terser' : false,
			terserOptions: minify
				? {
						mangle: { toplevel: true },
						format: { comments: false },
				  }
				: false,
			emptyOutDir: false,
			chunkSizeWarningLimit: 2048,
			rollupOptions: {
				input: [entryFile],
				external: ['path', 'module', 'url'],
				treeshake: {
					propertyReadSideEffects: false,
					moduleSideEffects: true,
					tryCatchDeoptimization: false,
					unknownGlobalSideEffects: false,
					correctVarValueBeforeDeclaration: false,
				},
				...chunksInputConfig,
				output: {
					dir: buildDir,
					assetFileNames: '[name].css',
					strict: false,
					exports: 'named',
					name: path.basename(entryFile).split('.')[0],
					intro: minify && !stylesOnly ? 'const window = self; const document = window.document;' : '',
					...chunksOuputConfig,
				},
			},
		},
		clearScreen: false,
		...defaultConfig.bundler,
		plugins: getPluginsConfig(
			[
				!TEST_ENV && ['preact-debug'],
				['css-inject'],
				['css-modules'],
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
				!TEST_ENV &&
					!watch &&
					!preact &&
					replace({
						preventAssignment: false,
						delimiters: ['', ''],
						values: minifiedProperties,
					}),
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
				watch && (preact ? ['prefresh'] : ['custom-prefresh']),
			].filter(Boolean),
			defaultConfig.bundler.plugins
		),
	});

	return { bundlerConfig, testConfig };
}

/**
 * @param {Awaited<ReturnType<import("./buildspec").default>>} buildSpecConfig
 * @returns {object} Bundler config
 */
async function bundler(buildSpecConfig) {
	const { bundlerConfig, testConfig } = getBundlerConfigs(buildSpecConfig);
	const { watch, testPath, entryFile, buildDir } = testConfig;

	// Ensure build folder
	try {
		if (!fs.existsSync(buildDir)) {
			fs.mkdirSync(buildDir);
		}
	} catch (error) {
		//
	}

	// if (outputOptions.entryFileNames && !output.assetFileNames) {
	// 	outputOptions.assetFileNames = getFileAs(outputOptions.entryFileNames, 'css');
	// }

	// const clearHashedAssets = () => {
	// 	// Check for hashed file names
	// 	if (/\[hash(]|:)/.test(outputOptions.entryFileNames) || chunks) {
	// 		// Clear previous hashed files from the build folder.
	// 		const files = glob.sync('**/*.?(js|css|map)', { cwd: buildDir, dot: true });
	// 		files.forEach((file) => {
	// 			rimraf(`${buildDir}/${file}`, (err) => {
	// 				if (err) console.error(err);
	// 			});
	// 		});
	// 	}
	// };

	let assetBundle;
	let server;

	if (!watch) {
		// clearHashedAssets();

		try {
			await build({
				root: testPath,
				...bundlerConfig,
			});
		} catch (error) {
			console.log(chalk.red('\nBundle error!'));
			throw new Error(error.message);
		}
	}
	// Otherwise start vite dev server
	else {
		const port = get(bundlerConfig, ['server', 'port'], DEV_SERVER_PORT);
		const serverConfig = bundlerConfig.server || {};

		console.log(chalk.cyanBright('\nStarting dev server'), `port ${port}`);
		console.log();

		server = await createServer({
			root: cwd,
			configFile: false,
			server: {
				port,
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
				...serverConfig,
			},
			...bundlerConfig,
			plugins: [
				basicSsl(),
				{
					name: 'a-b-doer:response-headers',
					configureServer: (server) => {
						server.middlewares.use((_req, res, next) => {
							res.setHeader('Access-Control-Request-Private-Network', 'true');
							res.setHeader('Access-Control-Allow-Private-Network', 'true');
							next();
						});
					},
				},
			]
				.concat(bundlerConfig.plugins)
				.filter(Boolean),
		});

		await server.listen();

		const moduleScripts = [
			`https://localhost:${port}/@vite/client`,
			`https://localhost:${port}${entryFile.replace(cwd, '')}`,
		];

		if (testConfig.toolbar) {
			moduleScripts.push(
				`https://localhost:${port}/${path.join(
					rootDir.replace(cwd, ''),
					'lib',
					'utils',
					'toolbar',
					'pptr-toolbar.jsx'
				)}`
			);
		}

		const injection = `!(() => { \ndocument.head.append(${moduleScripts
			.map((script) => `Object.assign(document.createElement('script'), { type: 'module', src: '${script}', })`)
			.join(', ')}); \n})();
		`;

		try {
			await openPage({ ...testConfig, assetBundle: { js: true, bundle: injection } }, true);
		} catch (error) {
			console.log('Error while opening page', error);
		}
	}
	return { ...testConfig, assetBundle, server };
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
 * @param {Array<[string, {[key: string]: any}]>} defaults
 * @param {Array<[string, {[key: string]: any} | Function] | {[key]: any}>} [override]
 */
function getPluginsConfig(defaults, override = []) {
	const fns = {
		'css-inject': cssInjectedByJsPlugin,
		'css-modules': cssModules,
		'preact-debug': preactDebug,
		replace,
		svgr,
		prefresh,
		'custom-prefresh': customJsxPrefreshPlugin,
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
				}
				return fn(overridePlugin[1]);
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
					}
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
				if (typeof fn === 'function') {
					return fn();
				}
				return fn;
			})
		);
}

const { cyan, yellow, red } = chalk;

const cmd = process.argv[2];

const cmds = ['watch', 'build', 'preview', 'build-all', 'screenshot'];

if (!cmds.includes(cmd)) {
	console.log('Unsupported command: ' + cmd);
	console.log('Supported commands are: ' + cmds.join(', '));
	process.exit();
}

const watch = cmd === 'watch';

let devServer = null;
let watcher = null;

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
			if (watcher) {
				console.log(cyan('Stopping previous config watcher...'));
				await watcher.close();
			}
			if (devServer) {
				console.log(cyan('Stopping previous dev server...'));
				console.log('');
				await devServer.close();
			} else {
				console.log(cyan('Starting bundler with a file watcher...'));
			}
			watcher = chokidar.watch(
				config.specs.map((spec) => spec.file),
				{
					awaitWriteFinish: true,
				}
			);
			watcher.on('change', (filepath) => {
				console.log('');
				console.log(cyan('Some test configuration file was changed...'));
				console.log('Config file', yellow(filepath));
				console.log('');
				console.log(cyan('Restarting...'));
				buildSingleEntry(targetPath);
				watcher.close();
			});
			break;
		case 'build':
			console.log(cyan('Building variant bundle...'));
			break;
	}

	console.log('Entry:', yellow(config.entryFile));

	try {
		const output = await bundler({ ...config, watch });
		devServer = output.server;
		if (!watch) {
			console.log(cyan('Bundle built.'));
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
				console.log(entryFile.replace(process.env.INIT_CWD, ''), cyan('Done.'));
			}
		}

		if (buildOnly) {
			console.log();
			console.log(cyan('Variant bundles built.'));
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

		console.log(cyan('Took screenshots for'), entryFile.replace(process.env.INIT_CWD, ''));
		console.log();
	}

	console.log(cyan('Done.'));
	if (origPage) {
		await origPage.browser().close();
	}
}

/**
 * Returns all entry buildspecs that matches the given path.
 * @param {string} targetPath
 * @return {Promise<Object[]>}
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
			const spec = await getBuildSpec(entryFile);
			if (spec && new RegExp(`${spec.buildDir}(/|$)`).test(entryFile)) {
				return null;
			}
			return spec;
		})
	);

	return entries.filter(Boolean);
}

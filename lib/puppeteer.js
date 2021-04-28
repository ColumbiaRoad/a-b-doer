import { yellow, green } from 'chalk';
import puppeteerCore from 'puppeteer-core';
import { getFlagEnv } from './utils';

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
export async function openPage(config, singlePage) {
	const { url: urls, assetBundle } = config;
	const url = getDefaultUrl(urls);
	let urlAfterLoad = url;

	const page = await getPage(config, singlePage);

	const pageTags = [];

	if (assetBundle.js) pageTags.push('js');
	if (assetBundle.styles) pageTags.push('css');

	let text = initial ? 'Opening' : 'Reloading';

	if (!singlePage) {
		text = 'Opening';
	}

	if (!isTest) {
		console.log(
			...[`#${++counter}`, text, `page ${yellow(url)}`].concat(pageTags.length ? ['with custom:', pageTags] : [])
		);
	}

	if (aboutpage) {
		aboutpage.close();
		aboutpage = null;
	}

	// TODO: Change to something less error prone if possible. Fixes the "already exposed function" error
	page._pageBindings.set('isOneOfBuildspecUrls', (url) => isOneOfBuildspecUrls(url, urls));

	// Remove previous listener
	if (loadListener) {
		page.off('domcontentloaded', loadListener);
	}

	// Add listener for load event. Using event makes it possible to refresh the page and keep these updates.
	loadListener = async () => {
		try {
			// TODO: same as above
			page._pageBindings.set('isOneOfBuildspecUrls', (url) => isOneOfBuildspecUrls(url, urls));

			// Always listen the history state api
			if (!isTest && config.historyChanges) {
				await page.evaluate((bundle) => {
					function _appendVariantScripts() {
						setTimeout(() => {
							if (typeof window.isOneOfBuildspecUrls !== 'function' || !window.isOneOfBuildspecUrls(location.href)) {
								return;
							}
							const node = document.createElement('script');
							node.innerHTML = bundle;
							document.head.appendChild(node);
						}, 10);
					}

					window.onpopstate = function () {
						_appendVariantScripts();
					};

					var pushState = history.pushState;
					history.pushState = function (state) {
						if (typeof history.onpushstate == 'function') {
							history.onpushstate({ state: state });
						}
						_appendVariantScripts();
						return pushState.apply(history, arguments);
					};
				}, assetBundle.bundle);
			}

			// Check if the current url matches watched test urls.
			if (!initial && !isOneOfBuildspecUrls(page.url(), urls)) {
				return;
			}

			try {
				await page.addScriptTag({ content: assetBundle.bundle });
			} catch (error) {
				console.log(error.message);
			}

			if (!isTest) {
				await page.evaluate((pageTags) => {
					console.log('\x1b[92m%s\x1b[0m', 'AB test loaded.\nInserted following assets:', pageTags.join(', '));
				}, pageTags);
			} else {
				page.off('domcontentloaded', loadListener);
				loadListener = null;
			}
		} catch (error) {
			if (config.debug) {
				console.log(error.message);
			}
		}
	};

	page.on('domcontentloaded', loadListener);

	await page.goto(url, { waitUntil: 'networkidle0' });

	initial = false;
	// There might be some redirect/hash/etc
	urlAfterLoad = page.url();

	// Push the changed url to the list of watched urls.
	if (!isOneOfBuildspecUrls(urlAfterLoad, urls)) {
		urls.push(urlAfterLoad);
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
		console.error(yellow(urls.join('\n')));
		process.exit();
	}
	return url;
}

/**
 * @param {Object} config
 * @returns {Promise<import("puppeteer").Browser>}
 */
export async function getBrowser(config = {}) {
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
export async function getPage(config, singlePage) {
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

	return newPage;
}

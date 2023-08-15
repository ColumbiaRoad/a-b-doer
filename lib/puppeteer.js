import chalk from 'chalk';
import path from 'path';
import puppeteerCore from 'puppeteer-core';
import { getFlagEnv } from './utils';
import { injectToolbar } from './utils/toolbar/pptr-toolbar';

const { yellow, green } = chalk;

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
export async function openPage(config, singlePage) {
	const { url: urls, assetBundle, onBefore, onLoad } = config;
	let url = getDefaultUrl(urls);
	let urlAfterLoad = url;

	const wasInitial = initial;
	if (initial) {
		initial = false;
	}

	const page = await getPage(config, singlePage);

	try {
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
				...[`#${++counter}`, text, `page ${yellow(url)}`].concat(pageTags.length ? ['with custom:', pageTags] : [])
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
					injectToolbar(page, { ...config, disabled }, wasInitial);
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

							if (!Array.isArray(window.dataLayer)) {
								window.dataLayer = [];
							} else {
								window.dataLayer.forEach(({ event }) => {
									if (event === activationEvent) {
										_appendVariantScripts();
									}
								});
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
	} catch (error) {
		console.error('Error while opening page', error);
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

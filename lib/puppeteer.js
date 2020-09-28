const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

let initial = true;
let counter = 0;
let loadListener = null;
let browser;
let pages = [];

/**
 * Opens a browser tab and injects all required styles and scripts to the DOM
 * @param {String} url
 * @param {String} buildDir
 * @param {Boolean} [singlePage]
 */
async function openBrowserTab(url, buildDir, singlePage) {
	const page = await getBrowserPage(singlePage);

	let files = [];
	try {
		files = fs.readdirSync(buildDir, { encoding: 'utf8' });
	} catch (error) {
		console.log('Cannot read build directory');
		process.exit();
	}

	const pageTags = files.reduce((tags, file) => {
		if (file[0] === '.' || file[0] === '_') {
			return tags;
		}
		const fileType = file.split('.').pop();

		const fileContent = fs.readFileSync(path.join(buildDir, file), 'utf8');

		switch (fileType) {
			case 'css':
				return {
					...tags,
					styles: (tags.styles || '') + fileContent,
				};
			case 'js':
				return {
					...tags,
					code: (tags.code || '') + fileContent,
				};
			default:
				return tags;
		}
	}, {});

	// Check which tags has some content. With style entries, js file is still generate on watch task for some reason.
	const keysWithValues = Object.keys(pageTags).reduce(
		(acc, key) => ((pageTags[key] || '').replace(/\s/gms, '') ? acc.concat(key) : acc),
		[]
	);

	console.log(`#${++counter}`, initial ? 'Opening' : 'Reloading', `page "${url}"`, 'with custom:', keysWithValues);

	try {
		// Remove previous listener
		if (loadListener) {
			page.off('domcontentloaded', loadListener);
		}

		// Add listener for load event. Using event makes it possible to refresh the page and keep these updates.
		loadListener = async () => {
			try {
				if (pageTags.styles && pageTags.styles) {
					await page.addStyleTag({ content: pageTags.styles });
				}
				if (pageTags.code) {
					await page.addScriptTag({ content: pageTags.code });
				}
			} catch (error) {
				console.log(error.message);
			}
		};

		page.on('domcontentloaded', loadListener);

		await page.goto(url);
	} catch (error) {
		console.log(error.message);
		process.exit();
	}

	initial = false;
}

/**
 * @param {Object} config
 * @returns {Promise<import("puppeteer").Browser>}
 */
async function initBrowser(config) {
	// Setup puppeteer
	if (!browser) {
		browser = await puppeteer.launch({
			headless: false,
			executablePath: config.browser,
			defaultViewport: null,
			args: ['--start-maximized'],
		});
	}
	return browser;
}

let useAbout = true;

let page;

/**
 * Return a puppeteer page. If there's no page created then this also creates the page.
 * @param {Boolean} singlePage
 * @returns {Promise<import("puppeteer").Page>}
 */
async function getBrowserPage(singlePage) {
	if (singlePage && page) {
		return page;
	}
	// Catch that empty about:blank
	if (useAbout) {
		useAbout = false;
		page = (await browser.pages())[0];
	}
	if (!page) {
		page = await browser.newPage();
	}

	pages = pages.concat(page);

	return page;
}

module.exports = {
	openBrowserTab,
	initBrowser,
	getBrowserPage,
};

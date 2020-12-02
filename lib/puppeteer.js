const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

let initial = true;
let counter = 0;
let loadListener = null;
let browser, context;
let aboutpage = null;

const windowSize = [1920, 1080];

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
		files = fs.readdirSync(buildDir, { encoding: 'utf8' }).filter((file) => {
			return fs.lstatSync(path.join(buildDir, file)).isFile();
		});
	} catch (error) {
		console.log('Cannot read build directory');
		console.log(error);
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

	if (aboutpage) {
		aboutpage.close();
		aboutpage = null;
	}

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

			await page.evaluate((keysWithValues) => {
				console.log(
					'\x1b[92m%s\x1b[0m',
					'AB test loaded.\nInserted following assets:',
					keysWithValues.map((v) => JSON.stringify(v)).join(', ')
				);
			}, keysWithValues);
		};

		page.on('domcontentloaded', loadListener);

		await page.goto(url);
	} catch (error) {
		console.log(error);
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
			devtools: true,
			executablePath: config.browser,
			userDataDir: config.userDataDir || undefined,
			defaultViewport: null,
			args: [`--window-size=${windowSize[0]},${windowSize[1]}`, '--incognito'],
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

		context = await browser.createIncognitoBrowserContext();

		browser.on('disconnected', () => {
			process.exit(0);
		});
	}
	return browser;
}

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

	let newPage;
	if (singlePage) {
		page = newPage = (await browser.pages())[0];
		aboutpage = null;
	} else {
		newPage = await context.newPage();
	}

	newPage.on('pageerror', (pageerr) => {
		console.log('\n\x1b[31m%s\x1b[0m', 'Page error!');
		console.error(pageerr);
	});

	return newPage;
}

module.exports = {
	openBrowserTab,
	initBrowser,
	getBrowserPage,
};

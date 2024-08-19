import puppeteer from 'puppeteer';

beforeAll(async () => {
	const browser = await puppeteer.launch();
	// store the browser instance so we can teardown it later
	// this global is only available in the teardown but not in TestEnvironments
	global.__BROWSER__ = browser;
	await browser.createBrowserContext();
});

afterAll(async () => {
	// close the browser instance
	await global.__BROWSER__.close();
});

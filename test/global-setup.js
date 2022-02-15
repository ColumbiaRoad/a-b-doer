import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import mkdirp from 'mkdirp';
import puppeteer from 'puppeteer';

const DIR = join(tmpdir(), 'jest_puppeteer_global_setup');

export default async function () {
	const browser = await puppeteer.launch();
	// store the browser instance so we can teardown it later
	// this global is only available in the teardown but not in TestEnvironments
	global.__BROWSER_GLOBAL__ = browser;

	// use the file system to expose the wsEndpoint for TestEnvironments
	mkdirp.sync(DIR);
	writeFileSync(join(DIR, 'wsEndpoint'), browser.wsEndpoint());
}

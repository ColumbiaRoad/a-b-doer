// puppeteer_environment.js
import { readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import puppeteer from 'puppeteer';
import NodeEnvironment from 'jest-environment-node';

const DIR = join(tmpdir(), 'jest_puppeteer_global_setup');

class PuppeteerEnvironment extends NodeEnvironment.default /* WHY?! */ {
	constructor(config) {
		super(config);
	}

	async setup() {
		await super.setup();
		// get the wsEndpoint
		const wsEndpoint = readFileSync(join(DIR, 'wsEndpoint'), 'utf8');
		if (!wsEndpoint) {
			throw new Error('wsEndpoint not found');
		}

		// connect to puppeteer
		this.global.__BROWSER__ = await puppeteer.connect({
			browserWSEndpoint: wsEndpoint,
		});

		this.global.__BROWSER_CONTEXT__ = await this.global.__BROWSER__.createIncognitoBrowserContext();
	}

	async teardown() {
		await super.teardown();
	}

	runScript(script) {
		return super.runScript(script);
	}
}

export default PuppeteerEnvironment;

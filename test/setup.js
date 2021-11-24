require('expect-puppeteer');
const failOnConsole = require('jest-fail-on-console');
const { config } = require('../lib/buildspec');

global.configDefaults = {
	...config,
	sourcemap: false,
	url: ['http://example.com/'],
	browser: process.env.BROWSER || '',
};

process.env.TEST_ENV = true;
process.env.IE = false;

jest.setTimeout(10000);

failOnConsole();

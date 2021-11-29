require('expect-puppeteer');
const failOnConsole = require('jest-fail-on-console');
const { config } = require('../lib/buildspec');
const path = require('path');

global.configDefaults = {
	...config,
	sourcemap: false,
	url: ['http://example.com/'],
	browser: process.env.BROWSER || '',
	bundler: {
		plugins: [
			// Add extra entry to alias plugin config
			[
				'alias',
				(options) => ({
					...options,
					entries: [
						...options.entries,
						{ find: 'a-b-doer/hooks', replacement: path.join(__dirname, '..', 'hooks') },
						{ find: 'a-b-doer', replacement: path.join(__dirname, '..', 'main') },
					],
				}),
			],
		],
	},
};

process.env.TEST_ENV = true;
process.env.IE = false;

jest.setTimeout(10000);

failOnConsole();

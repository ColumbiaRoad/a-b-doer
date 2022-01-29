import 'expect-puppeteer';
import failOnConsole from 'jest-fail-on-console';
import { config } from '../lib/buildspec';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

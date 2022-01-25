import 'expect-puppeteer';
import failOnConsole from 'jest-fail-on-console';
import { config } from '../lib/buildspec';
import { join } from 'path';

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
						{ find: 'a-b-doer/hooks', replacement: join('..', 'hooks') },
						{ find: 'a-b-doer', replacement: join('..', 'main') },
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

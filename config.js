import { config } from 'dotenv';
import { join } from 'path';

config();

if (!process.env.BROWSER_PATH) {
	console.log('You must define a BROWSER_PATH environment variable');
	process.exit();
}

export default {
	browser: process.env.BROWSER_PATH,
	bundler: {
		plugins: [
			// Add extra entry to alias plugin config
			[
				'alias',
				(options) => ({
					...options,
					entries: [
						...options.entries,
						{ find: 'a-b-doer/hooks', replacement: join('.', 'hooks') },
						{ find: 'a-b-doer', replacement: join('.', 'main') },
					],
				}),
			],
		],
	},
	screenshot: {
		onBefore: (page) => {
			page.on('domcontentloaded', () =>
				page.evaluate(() => document.querySelectorAll('.sub').forEach((node) => node.remove()))
			);
		},
	},
};

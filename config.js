import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
						{ find: 'a-b-doer/hooks', replacement: path.join(__dirname, 'hooks') },
						{ find: 'a-b-doer', replacement: path.join(__dirname, 'main') },
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

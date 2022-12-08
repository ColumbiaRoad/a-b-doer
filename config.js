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
		// Add extra entry to alias config
		resolve: (config = {}) => ({
			...config,
			alias: [
				{ find: 'a-b-doer/hooks', replacement: path.join(__dirname, 'hooks') },
				{ find: 'a-b-doer', replacement: path.join(__dirname, 'main') },
				...(config.alias || []),
			],
		}),
	},
	screenshot: {
		onBefore: (page) => {
			page.on('domcontentloaded', () =>
				page.evaluate(() => document.querySelectorAll('.sub').forEach((node) => node.remove()))
			);
		},
	},
};

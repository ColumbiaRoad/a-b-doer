require('dotenv').config();
const path = require('path');

if (!process.env.BROWSER_PATH) {
	console.log('You must define a BROWSER_PATH environment variable');
	process.exit();
}

module.exports = {
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

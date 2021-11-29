const path = require('path');

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
};

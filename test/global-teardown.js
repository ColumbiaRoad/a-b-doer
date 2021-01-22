const glob = require('glob');
const path = require('path');
const rimraf = require('rimraf');
const os = require('os');

const DIR = path.join(os.tmpdir(), 'jest_puppeteer_global_setup');

module.exports = async () => {
	glob(path.join(__dirname, './**/.build'), (er, dirs) => {
		dirs.forEach((dir) => rimraf.sync(dir));
		console.log('Cleared all test build folders...');
	});

	// close the browser instance
	await global.__BROWSER_GLOBAL__.close();

	// clean-up the wsEndpoint file
	rimraf.sync(DIR);
};

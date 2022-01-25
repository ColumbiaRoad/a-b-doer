import glob from 'glob';
import { join } from 'path';
import rimraf from 'rimraf';
import { tmpdir } from 'os';

const DIR = join(tmpdir(), 'jest_puppeteer_global_setup');

export default async () => {
	glob('./**/.build', (er, dirs) => {
		dirs.forEach((dir) => rimraf.sync(dir));
		console.log('Cleared all test build folders...');
	});

	// close the browser instance
	await global.__BROWSER_GLOBAL__.close();

	// clean-up the wsEndpoint file
	rimraf.sync(DIR);
};

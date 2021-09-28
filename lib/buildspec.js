import path from 'path';
import fs from 'fs';
import { createFilter } from '@rollup/pluginutils';
import merge from 'lodash.merge';

/**
 * Config defaults
 */
export const config = {
	appendStyles: true,
	buildDir: '.build',
	chunkImages: true,
	devtools: true,
	historyChanges: true,
	minify: true,
	modules: true,
	preact: false,
	sourcemap: true,
	watch: false,
	windowSize: [1920, 1080],
};

function getConfigFileJsonOrJSContent(configPath) {
	const fileDir = path.dirname(configPath);
	const fileWithoutExt = path.basename(configPath, '.json');
	const configPathJs = path.resolve(fileDir, fileWithoutExt + '.js');
	if (fs.existsSync(configPath)) {
		return require(configPath);
	} else if (fs.existsSync(configPathJs)) {
		return require(configPathJs);
	}
	return {};
}

export default function (testPath) {
	if (!testPath) {
		console.log('Test folder is missing');
		process.exit();
	}

	let entryFile = '';

	try {
		// If the test path argument is a file, use it as an entry
		if (!fs.lstatSync(testPath).isDirectory()) {
			let testDir = path.dirname(testPath);
			entryFile = testPath.replace(testDir, '.');
			testPath = testDir;
		}
	} catch (error) {
		console.error(error);
		process.exit();
	}

	if (!fs.existsSync(testPath)) {
		console.log('Test folder does not exist', testPath);
		process.exit();
	}

	// Check & load build related data
	const testConfig = {};

	merge(testConfig, getConfigFileJsonOrJSContent(path.resolve(process.cwd(), 'config.json')));

	try {
		merge(testConfig, getConfigFileJsonOrJSContent(path.join(testPath, '..', 'buildspec.json')));
		merge(testConfig, getConfigFileJsonOrJSContent(path.join(testPath, 'buildspec.json')));
	} catch (error) {
		console.error(error);
	}

	// Empty config object or the buildspec.json is missing
	if (!Object.keys(testConfig).length) {
		return null;
	}

	if (!entryFile) {
		if (testConfig.entry) {
			entryFile = testConfig.entry;
		} else {
			const files = fs.readdirSync(testPath, { encoding: 'utf8' });
			// Find first index file
			const indexFile = files.find((file) => /index\.(jsx?|tsx?|(le|sa|sc|c)ss)$/.test(file));
			if (indexFile) {
				entryFile = indexFile;
			}
			// Try some style file
			else {
				entryFile = files.find((file) => /styles?\.(le|sa|sc|c)ss$/.test(file));
			}
		}
	}

	let entryPart = entryFile;
	if (entryFile) {
		entryFile = path.resolve(testPath, entryFile);
	}

	if (!entryFile) return null;

	// Check that given entry is not excluded.
	const filter = createFilter(testConfig.include, testConfig.exclude);
	if (!filter(entryFile)) {
		return null;
	}

	if (testConfig.url && !Array.isArray(testConfig.url)) {
		testConfig.url = [testConfig.url];
	}

	return { ...config, ...testConfig, testPath, entryFile, entryPart, entryFileExt: entryFile.split('.').pop() };
}

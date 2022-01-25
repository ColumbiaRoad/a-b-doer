import path from 'path';
import fs from 'fs';
import { createFilter } from '@rollup/pluginutils';
import merge from 'lodash.merge';
import { createRequire } from 'module';

// Require is not defined in ES module scope
const require = createRequire(import.meta.url);

/**
 * Config defaults
 */
export const config = {
	appendStyles: true,
	buildDir: '.build',
	chunkImages: false,
	chunks: false,
	devtools: true,
	historyChanges: true,
	modules: true,
	preact: false,
	sourcemap: true,
	watch: false,
	windowSize: [1920, 1080],
	features: {
		hooks: 'auto',
		jsx: 'auto',
		classes: true,
		namespaces: true,
	},
};

async function getConfigFileJsonOrJSContent(configPath) {
	const fileDir = path.dirname(configPath);
	const fileWithoutExt = path.basename(configPath, '.json');
	const configPathJs = path.resolve(fileDir, fileWithoutExt + '.js');
	if (fs.existsSync(configPath)) {
		// Clear require cache before loading the file
		delete require.cache[configPath];
		return require(configPath);
	} else if (fs.existsSync(configPathJs)) {
		// Import file with a cache buster
		const { default: configMod } = await import(configPathJs + '?cb=' + Math.random().toString(36).substring(3));
		return configMod;
	}
	return {};
}

async function mergeSpecs(testConfig, specConfigPath) {
	const specConfig = await getConfigFileJsonOrJSContent(specConfigPath);
	if (!Object.keys(specConfig).length) {
		return;
	}
	merge(testConfig, specConfig);
	testConfig._specFiles = testConfig._specFiles || [];
	testConfig._specFiles.push(specConfigPath, specConfigPath.substr(0, specConfigPath.length - 2));
}

export default async function (testPath) {
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

	await mergeSpecs(testConfig, path.resolve(process.cwd(), 'config.json'));

	try {
		await mergeSpecs(testConfig, path.join(testPath, '..', 'buildspec.json'));
		await mergeSpecs(testConfig, path.join(testPath, 'buildspec.json'));
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

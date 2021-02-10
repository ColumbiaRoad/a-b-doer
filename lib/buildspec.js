import path from 'path';
import fs from 'fs';
import { createFilter } from '@rollup/pluginutils';

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

	const configPath = path.resolve(process.env.INIT_CWD, 'config.json');
	const configPathJs = path.resolve(process.env.INIT_CWD, 'config.js');
	if (fs.existsSync(configPath)) {
		Object.assign(testConfig, require(configPath));
	} else if (fs.existsSync(configPathJs)) {
		Object.assign(testConfig, require(configPathJs));
	}

	let hasBuildSpec = false;
	try {
		const parentSpecFile = path.join(testPath, '..', 'buildspec.json');
		if (fs.existsSync(parentSpecFile)) {
			hasBuildSpec = true;
			Object.assign(testConfig, require(parentSpecFile));
		}
		const specFile = path.join(testPath, 'buildspec.json');
		if (fs.existsSync(specFile)) {
			hasBuildSpec = true;
			Object.assign(testConfig, require(specFile));
		}
	} catch (error) {}

	// Empty config object or the buildspec.json is missing
	if (!Object.keys(testConfig).length || !hasBuildSpec) {
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

	return { ...testConfig, testPath, entryFile, entryPart, entryFileExt: entryFile.split('.').pop() };
}

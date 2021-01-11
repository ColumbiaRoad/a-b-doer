import path from 'path';
import fs from 'fs';

export default function (testPath, pathsOnly) {
	if (!testPath) {
		console.log('Test folder is missing');
		process.exit();
	}

	testPath = path.resolve(process.env.INIT_CWD, testPath);

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
	if (fs.existsSync(configPath)) {
		Object.assign(testConfig, require(configPath));
	}

	if (!pathsOnly) {
		try {
			const parentSpecFile = path.join(testPath, '..', 'buildspec.json');
			if (fs.existsSync(parentSpecFile)) {
				Object.assign(testConfig, require(parentSpecFile));
			}
			const specFile = path.join(testPath, 'buildspec.json');
			if (fs.existsSync(specFile)) {
				Object.assign(testConfig, require(specFile));
			}
		} catch (error) {}

		if (!Object.keys(testConfig).length) {
			console.log("test's buildspec.json is missing");
			process.exit();
		}
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

	return { ...testConfig, testPath, entryFile, entryPart };
}

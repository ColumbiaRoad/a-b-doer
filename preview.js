const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { openBrowserTab, initBrowser } = require('./lib/puppeteer.js');

/**
 * Load the config for the whole testing project
 */
let config = {};
try {
	const configPath = path.resolve(__dirname, 'config.json');
	if (fs.existsSync(configPath)) {
		config = require(configPath);
	}
} catch (error) {
	console.log('./config.json file is missing');
	process.exit();
}

let testPath = process.argv[2];
if (!testPath) {
	console.log('Test folder is missing');
	process.exit();
}

const buildOnly = process.env.BUILD_ONLY === 'true';

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
	process.exit();
}

if (!fs.existsSync(testPath)) {
	console.log('Test folder does not exist', testPath);
	process.exit();
}

// Check & load build related data
let testConfig;
try {
	const specFile = path.join(testPath, 'buildspec.json');
	if (fs.existsSync(specFile)) {
		testConfig = require(specFile);
	} else {
		const parentSpecFile = path.join(testPath, '..', 'buildspec.json');
		if (fs.existsSync(parentSpecFile)) {
			testConfig = require(parentSpecFile);
		}
	}
} catch (error) {}

if (!testConfig) {
	console.log("test's buildspec.json is missing");
	process.exit();
}

let indexFiles = [];

if (!entryFile) {
	if (testConfig.entry) {
		entryFile = testConfig.entry;
	} else {
		const files = fs.readdirSync(testPath, { encoding: 'utf8' });

		const isIndex = (file) => /index\.(jsx?|tsx?|(sa|sc|c)ss)$/.test(file);

		files.forEach((file) => {
			if (file.includes('.build')) return;
			const filePath = path.resolve(testPath, file);
			if (fs.lstatSync(filePath).isDirectory()) {
				const subFiles = fs.readdirSync(filePath, { encoding: 'utf8' });
				indexFiles = indexFiles.concat(subFiles.find(isIndex)).map((p) => path.resolve(filePath, p));
			} else if (isIndex(file)) {
				indexFiles = indexFiles.concat(filePath);
			}
		});
	}
}

if (!indexFiles.length) {
	console.log("Couldn't find any test files");
	process.exit();
}

(async () => {
	if (!buildOnly) {
		await initBrowser(config);
	}

	indexFiles.forEach(async (entryFile) => {
		const buildDir = path.join(path.dirname(entryFile), '.build');
		execSync(`yarn run build ${entryFile}`);
		if (!buildOnly) {
			await openBrowserTab(testConfig.url, buildDir, indexFiles.length === 1);
		} else {
			console.log(entryFile.replace(process.env.INIT_CWD, ''), '\x1b[32mDone', '\x1b[0m');
		}
	});
	if (buildOnly) {
		console.log('Test bundles built.');
		process.exit(0);
	}
})();

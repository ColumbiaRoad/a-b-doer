#!/usr/bin/env node
import { readdirSync } from 'fs';
import path from 'path';
import buildspec from '../lib/buildspec';
import { bundler, openPage } from '../lib/bundler';
import { getBrowser } from '../lib/puppeteer';
import { cyan, yellow, green } from 'chalk';

const cmd = process.argv[2];

const cmds = ['watch', 'build', 'preview', 'build-all', 'screenshot'];

if (!cmds.includes(cmd)) {
	console.log('Unsupported command: ' + cmd);
	console.log('Supported commands are: ' + cmds.join(', '));
	process.exit();
}

const watch = cmd === 'watch';

const targetPath = process.argv[3];

console.log('');

// More graceful exit
process.on('SIGINT', () => {
	console.log('');
	process.exit();
});

switch (cmd) {
	case 'watch':
	case 'build':
		buildSingleEntry();
		break;
	case 'preview':
	case 'build-all':
		buildMultiEntry();
		break;
	case 'screenshot':
		createTestScreenshots();
		break;
	default:
		process.exit();
}

/**
 * Builds a bundle for commands that have single matching entry.
 */
async function buildSingleEntry() {
	const config = buildspec(targetPath);

	switch (cmd) {
		case 'watch':
			console.log(cyan('Starting bundler with a file watcher...'));
			break;
		case 'build':
			console.log(cyan('Building test bundle...'));
			break;
		default:
			break;
	}

	console.log('Entry:', yellow(config.entryFile));
	console.log('');

	try {
		await bundler({ ...config, watch });
		console.log(green('Bundle built.'));
		console.log('');
	} catch (error) {
		console.log(error);
	}
}

/**
 * Returns all entries that matches given test configuration object..
 * @param {{testPath: string}} targetPath
 * @return {string[]}
 */
function getMatchingEntries(testConfig) {
	let indexFiles = [];

	const { testPath, entryFile } = testConfig;

	if (!entryFile) {
		if (testConfig.entry) {
			entryFile = testConfig.entry;
		} else {
			const files = readdirSync(testPath, { encoding: 'utf8' });
			indexFiles = indexFiles.concat(files).map((file) => path.join(testPath, file));
		}
	} else {
		indexFiles = indexFiles.concat(entryFile);
	}

	return indexFiles;
}

/**
 * Builds a bundle for commands that may have multiple matching entries.
 */
async function buildMultiEntry() {
	const testConfig = buildspec(targetPath, true);
	const buildOnly = cmd === 'build-all';
	const indexFiles = getMatchingEntries(testConfig);

	if (!indexFiles.length) {
		console.log("Couldn't find any test files");
		process.exit();
	}

	switch (cmd) {
		case 'preview':
			console.log(cyan('Starting bundlers for preview...'));
			break;
		case 'build-all':
			console.log(cyan('Building all test bundles...'));
			break;
		default:
			break;
	}

	console.log();

	try {
		if (!buildOnly) {
			await getBrowser(testConfig);
		}

		for (const entryFile of indexFiles) {
			const output = await bundler(buildspec(entryFile));
			if (!buildOnly) {
				await openPage(output);
			} else {
				console.log(entryFile.replace(process.env.INIT_CWD, ''), green('Done.'));
			}
		}

		if (buildOnly) {
			console.log();
			console.log(green('Test bundles built.'));
			console.log();
			process.exit(0);
		}
	} catch (e) {
		console.log(e);
		// Do nothing
	}
}

async function createTestScreenshots() {
	const testConfig = buildspec(targetPath, true);
	const indexFiles = getMatchingEntries(testConfig);

	let origPage;

	for (const entryFile of indexFiles) {
		const config = buildspec(entryFile);
		const output = await bundler(config);
		const page = await openPage({ ...output, headless: true, devtools: false });
		// Take screenshot from variant
		await page.screenshot({
			path: path.join(config.testPath, '.build', `screenshot-var${indexFiles.indexOf(entryFile) + 1}.png`),
			fullPage: true,
		});
		// Get new page for the original (without listeners etc)
		if (!origPage) {
			origPage = await page.browser().newPage();
		}
		// Go to the same url and take the screenshot from the original as well.
		await origPage.goto(config.url);
		await origPage.screenshot({ path: path.join(config.testPath, '.build', `screenshot-orig.png`), fullPage: true });
		console.log(green('Took screenshots for'), entryFile.replace(process.env.INIT_CWD, ''));
		console.log();
	}

	await origPage.browser().close();
	console.log(green('Done.'));
}

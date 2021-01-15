#!/usr/bin/env node
import { readdirSync, lstatSync } from 'fs';
import path from 'path';
import { createFilter } from '@rollup/pluginutils';
import buildspec from '../lib/buildspec';
import { bundler, openPage } from '../lib/bundler';
import { getBrowser } from '../lib/puppeteer';
import { cyan, yellow, green, red } from 'chalk';

const cmd = process.argv[2];

const cmds = ['watch', 'build', 'preview', 'build-all', 'screenshot'];

if (!cmds.includes(cmd)) {
	console.log('Unsupported command: ' + cmd);
	console.log('Supported commands are: ' + cmds.join(', '));
	process.exit();
}

const watch = cmd === 'watch';

const targetPath = process.argv[3] || '.';

console.log('');

// More graceful exit
process.on('SIGINT', () => {
	console.log('');
	process.exit();
});

switch (cmd) {
	case 'watch':
	case 'build':
		buildSingleEntry(targetPath);
		break;
	case 'preview':
	case 'build-all':
		buildMultiEntry(targetPath);
		break;
	case 'screenshot':
		createScreenshots(targetPath);
		break;
	default:
		process.exit();
}

/**
 * Builds a bundle for commands that have single matching entry.
 * @param {string} targetPath
 */
async function buildSingleEntry(targetPath) {
	const [config] = getMatchingBuildspec(targetPath);

	if (!config) {
		console.log(red("Couldn't find buildspec.json for the variant", targetPath));
		process.exit();
	}

	switch (cmd) {
		case 'watch':
			console.log(cyan('Starting bundler with a file watcher...'));
			break;
		case 'build':
			console.log(cyan('Building variant bundle...'));
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
 * Builds a bundle for commands that may have multiple matching entries.
 * @param {string} targetPath
 */
async function buildMultiEntry(targetPath) {
	const buildOnly = cmd === 'build-all';
	const buildspecs = getMatchingBuildspec(targetPath);
	const [testConfig] = buildspecs;

	if (!testConfig) {
		console.log("Couldn't find any variant files");
		process.exit();
	}

	switch (cmd) {
		case 'preview':
			console.log(cyan('Starting bundlers for preview...'));
			break;
		case 'build-all':
			console.log(cyan('Building all variant bundles...'));
			break;
		default:
			break;
	}

	console.log();

	try {
		if (!buildOnly) {
			await getBrowser(testConfig);
		}

		for (const buildspec of buildspecs) {
			const { entryFile } = buildspec;
			const output = await bundler(buildspec);
			if (!buildOnly) {
				await openPage(output);
			} else {
				console.log(entryFile.replace(process.env.INIT_CWD, ''), green('Done.'));
			}
		}

		if (buildOnly) {
			console.log();
			console.log(green('Variant bundles built.'));
			console.log();
			process.exit(0);
		}
	} catch (e) {
		console.log(e);
		// Do nothing
	}
}

/**
 * Creates screenshots from variants that matches the given path.
 * @param {string} targetPath
 */
async function createScreenshots(targetPath) {
	const buildspecs = getMatchingBuildspec(targetPath);

	if (!buildspecs.length) {
		console.log(red('0 test variants found with path:'));
		console.log(targetPath);
		process.exit();
	}

	let origPage;

	for (const config of buildspecs) {
		const nth = buildspecs.indexOf(config) + 1;
		const { entryFile } = config;
		const output = await bundler(config);
		const page = await openPage({ ...output, headless: true, devtools: false });
		// Take screenshot from variant
		await page.screenshot({
			path: path.join(config.testPath, '.build', `screenshot-var${nth}.png`),
			fullPage: true,
		});
		// Get new page for the original (without listeners etc)
		if (!origPage) {
			origPage = await page.browser().newPage();
		}
		// Go to the same url and take the screenshot from the original as well.
		await origPage.goto(config.url, { waitUntil: 'networkidle0' });
		await origPage.screenshot({ path: path.join(config.testPath, '.build', `screenshot-orig.png`), fullPage: true });
		console.log(green('Took screenshots for'), entryFile.replace(process.env.INIT_CWD, ''));
		console.log();
	}

	if (origPage) {
		await origPage.browser().close();
	}

	console.log(green('Done.'));
}

/**
 * Returns all entry buildspecs that matches the given path.
 * @param {string} targetPath
 * @return {Object[]}
 */
function getMatchingBuildspec(targetPath) {
	let indexFiles = [];

	targetPath = path.resolve(process.env.INIT_CWD, targetPath);

	if (lstatSync(targetPath).isFile()) {
		indexFiles = indexFiles.concat(targetPath);
	}

	if (!indexFiles.length) {
		const files = readdirSync(targetPath, { encoding: 'utf8' });
		indexFiles = indexFiles.concat(
			targetPath,
			files.map((file) => path.join(targetPath, file))
		);
	}

	return indexFiles
		.map((entryFile) => {
			const filter = createFilter([/\.(jsx?|tsx?|(le|sa|sc|c)ss)$/]);
			if (entryFile.includes('.build')) {
				return null;
			}
			if (!filter(entryFile) && !lstatSync(entryFile).isDirectory()) {
				return null;
			}
			return buildspec(entryFile);
		})
		.filter(Boolean);
}

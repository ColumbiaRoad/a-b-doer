#!/usr/bin/env node
import { readdirSync } from 'fs';
import { join } from 'path';
import buildspec from '../lib/buildspec';
import { bundler, openPage } from '../lib/bundler';
import { getBrowser } from '../lib/puppeteer';
import { cyan, yellow, green } from 'chalk';

const cmd = process.argv[2];

const cmds = ['watch', 'build', 'preview', 'build-all'];

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

if (watch || cmd === 'build') {
	buildSingleEntry();
} else {
	buildMultiEntry();
}

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

async function buildMultiEntry() {
	const testConfig = buildspec(targetPath, true);
	const buildOnly = cmd === 'build-all';
	let indexFiles = [];

	const { testPath, entryFile } = testConfig;

	if (!entryFile) {
		if (testConfig.entry) {
			entryFile = testConfig.entry;
		} else {
			const files = readdirSync(testPath, { encoding: 'utf8' });
			indexFiles = indexFiles.concat(files).map((file) => join(testPath, file));
		}
	} else {
		indexFiles = indexFiles.concat(entryFile);
	}

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
			const output = await bundler({ ...buildspec(entryFile) });
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

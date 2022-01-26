#!/usr/bin/env node
import { readdirSync, lstatSync, readFileSync } from 'fs';
import path from 'path';
import { createFilter } from '@rollup/pluginutils';
import buildspec from '../lib/buildspec';
import { bundler, openPage } from '../lib/bundler';
import { getBrowser } from '../lib/puppeteer';
import { cyan, yellow, green, red } from 'chalk';
import chokidar from 'chokidar';
import minimist from 'minimist';

const cmd = process.argv[2];

const cmds = ['watch', 'build', 'preview', 'build-all', 'screenshot'];

if (!cmds.includes(cmd)) {
	console.log('Unsupported command: ' + cmd);
	console.log('Supported commands are: ' + cmds.join(', '));
	process.exit();
}

const watch = cmd === 'watch';

let rollupWatcher = null;

const targetPath = process.argv[3] || '.';

const cmdArgs = minimist(process.argv.slice(3), {
	boolean: ['build'],
	alias: {
		b: 'build',
		u: 'url',
		n: 'name',
	},
});

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
			if (rollupWatcher) {
				rollupWatcher.close();
			} else {
				console.log(cyan('Starting bundler with a file watcher...'));
			}
			const watcher = chokidar.watch(config._specFiles, {
				awaitWriteFinish: true,
			});
			watcher.on('change', (filepath) => {
				console.log('');
				console.log('Buildspec changed', yellow(filepath));
				console.log(green('Restarting bundler...'));
				console.log('');
				buildSingleEntry(targetPath);
				watcher.close();
			});
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
		const output = await bundler({ ...config, watch });
		rollupWatcher = output.watcher;
		if (!watch) {
			console.log(green('Bundle built.'));
		}
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

	const { url: cmdArgUrl, name, ...screenshotArgs } = cmdArgs;
	let cmdArgBuild = false;
	if ('build' in screenshotArgs) {
		cmdArgBuild = true;
		delete screenshotArgs.build;
	}

	if (!buildspecs.length) {
		console.log(red('0 test variants found with path:'));
		console.log(targetPath);
		process.exit();
	}

	let origPage;

	console.log(cyan(`Taking screenshots`));
	console.log();

	for (const config of buildspecs) {
		const nth = buildspecs.indexOf(config) + 1;
		if (cmdArgUrl) {
			if (isNaN(cmdArgUrl)) {
				config.url = [cmdArgUrl];
			} else {
				if (Array.isArray(config.url)) {
					const urlIndex = +cmdArgUrl;
					if (urlIndex < config.url.length) {
						config.url = [config.url[urlIndex]];
					} else {
						console.log(yellow(`Undefined index for test config url. Argument was`), '--url=' + cmdArgUrl);
						console.log(yellow(`Current config`), config.url);
					}
				} else {
					console.log(
						yellow(`Test config url wasn't an array, can't use indexed url argument. Argument was`),
						'--url=' + cmdArgUrl
					);
				}
			}
		}
		const { testPath, buildDir, entryFile, entryFileExt, screenshot = {}, onLoad, onBefore } = config;

		Object.assign(screenshot, screenshotArgs);

		let {
			waitFor,
			waitForOptions = {},
			onLoad: screenshotOnLoad,
			onBefore: screenshotOnBefore,
			...pptrScreenshotOptions
		} = screenshot;
		const entryName = path.basename(entryFile, '.' + entryFileExt);

		// Bundle main events and screenshot events
		const singleOnLoad = async (page) => {
			if (onLoad) await onLoad(page);
			if (screenshotOnLoad) await screenshotOnLoad(page);
		};

		const singleOBefore = async (page) => {
			if (onBefore) await onBefore(page);
			if (screenshotOnBefore) await screenshotOnBefore(page);
		};

		const bundleConfig = { ...config, onLoad: singleOnLoad, onBefore: singleOBefore, preview: true };

		if (!cmdArgBuild) {
			const bundlePath = path.join(testPath, buildDir, `${entryName}.bundle.js`);
			if (lstatSync(bundlePath).isFile()) {
				bundleConfig.assetBundle = {
					bundle: readFileSync(bundlePath).toString(),
				};
			}
		}

		const output = bundleConfig.assetBundle ? bundleConfig : await bundler(bundleConfig);

		console.log(cyan(`Creating a bundle for screenshot`), entryFile);
		console.log();

		const page = await openPage({ ...output, headless: true, devtools: false });
		const url = Array.isArray(config.url) ? config.url[0] : config.url;

		const waitForAll = async (page) => {
			if (typeof waitFor === 'string') {
				console.log(cyan(`Waiting for selector ${waitFor}...`));
				await page.waitForSelector(waitFor, waitForOptions);
			}
			if (typeof waitFor === 'number') {
				console.log(cyan(`Waiting for timeout ${waitFor} ms...`));
				await page.waitForTimeout(waitFor, waitForOptions);
			}
			if (typeof waitFor === 'function') {
				console.log(cyan(`Waiting for function...`));
				await page.waitForFunction(waitFor, waitForOptions);
			}
		};

		if (pptrScreenshotOptions.fullPage === undefined) {
			pptrScreenshotOptions.fullPage = true;
		}
		if (pptrScreenshotOptions.clip) {
			pptrScreenshotOptions.fullPage = false;
		}

		await waitForAll(page);

		// Take screenshot from variant
		await page.screenshot({
			...pptrScreenshotOptions,
			path: path.join(config.testPath, config.buildDir, `screenshot-${path.basename(name || entryName)}-v${nth}.png`),
		});

		console.log(cyan(`Screenshot ready`), `${entryFile}, variant ${nth}`);

		// Get new page for the original (without listeners etc)
		origPage = await page.browser().newPage();

		await singleOBefore(origPage);

		// Go to the same url and take the screenshot from the original as well.
		await origPage.goto(url, { waitUntil: 'networkidle0' });

		await singleOnLoad(origPage);

		await waitForAll(origPage);

		await origPage.screenshot({
			...pptrScreenshotOptions,
			path: path.join(config.testPath, config.buildDir, `screenshot-${path.basename(name || entryName)}-orig.png`),
		});

		console.log(cyan(`Screenshot ready`), `${entryFile}, original`);
		console.log();

		console.log(green('Took screenshots for'), entryFile.replace(process.env.INIT_CWD, ''));
		console.log();
	}

	console.log(green('Done.'));
	if (origPage) {
		await origPage.browser().close();
	}
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
			files.map((file) => path.join(targetPath, file)).filter((path) => lstatSync(path).isDirectory())
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
			const spec = buildspec(entryFile);
			if (spec && new RegExp(`${spec.buildDir}(/|$)`).test(entryFile)) {
				return null;
			}
			return spec;
		})
		.filter(Boolean);
}

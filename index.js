const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const rollup = require('rollup').rollup;
const rollupWatch = require('rollup').watch;
const resolve = require('@rollup/plugin-node-resolve').default;
const babel = require('@rollup/plugin-babel').default;
const terser = require('rollup-plugin-terser').terser;
const scss = require('rollup-plugin-scss');
const autoprefixer = require('autoprefixer');
const postcss = require('postcss');
const glob = require('glob');
const alias = require('@rollup/plugin-alias');

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
testPath = path.resolve(testPath);

if (!fs.existsSync(testPath)) {
	console.log('Test folder does not exist', testPath);
	process.exit();
}

const watch = process.env.PROJECT_WATCH === 'true';

let page = null;

/**
 * Return a puppeteer page. If there's no page created then this also creates the page.
 *
 * @returns {Promise<import("puppeteer").Page>}
 */
async function getBrowserPage() {
	if (page) return page;

	// Setup puppeteer
	const browser = await puppeteer.launch({
		headless: false,
		executablePath: config.browser,
		defaultViewport: null,
		args: ['--start-maximized'],
	});

	page = (await browser.pages())[0];
	if (!page) {
		page = await browser.newPage();
	}

	page.on('close', () => {
		process.exit();
	});

	return page;
}

let initial = true;
let counter = 0;
let loadListener = null;

/**
 * Opens a browser tab and injects all required styles and scripts to the DOM
 * @param {String} url
 * @param {Object} pageTags
 */
async function openBrowserTab(url, pageTags = {}) {
	const page = await getBrowserPage();

	// Check which tags has some content. With style entries, js file is still generate on watch task for some reason.
	const keysWithValues = Object.keys(pageTags).reduce(
		(acc, key) => ((pageTags[key] || '').replace(/\s/gms, '') ? acc.concat(key) : acc),
		[]
	);
	console.log(`#${++counter}`, initial ? 'Opening' : 'Reloading', `page "${url}"`, 'with custom:', keysWithValues);

	try {
		// Remove previous listener
		if (loadListener) {
			page.off('domcontentloaded', loadListener);
		}

		// Add listener for load event. Using event makes it possible to refresh the page and keep these updates.
		loadListener = async () => {
			try {
				if (pageTags.styles && pageTags.styles) {
					await page.addStyleTag({ content: pageTags.styles });
				}
				if (pageTags.js) {
					await page.addScriptTag({ content: pageTags.js });
				}
			} catch (error) {
				console.log(error.message);
			}
		};

		page.on('domcontentloaded', loadListener);

		await page.goto(url);
	} catch (error) {
		console.log(error.message);
		process.exit();
	}

	initial = false;
}

/**
 * Async wrapper for the bundler and the bundle watcher.
 */
(async () => {
	// Ensure build folder
	const buildDir = path.join(testPath, '.build');
	try {
		if (!fs.existsSync(buildDir)) {
			fs.mkdirSync(buildDir);
		}
	} catch (error) {}

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

	let entryFile = '';

	if (testConfig.entry) {
		entryFile = testConfig.entry;
	} else {
		const files = fs.readdirSync(testPath, { encoding: 'utf8' });
		// Find first index file
		const indexFile = files.find((file) => /index\.(jsx?|tsx?|(sa|sc|c)ss)$/.test(file));
		if (indexFile) {
			entryFile = indexFile;
		}
		// Try some style file
		else {
			entryFile = files.find((file) => /styles?\.(sa|sc|c)ss$/.test(file));
		}
	}

	// Bundler behaves a little bit differently when there's style file as an entry.
	let stylesOnly = /\.(sa|sc|c)ss$/.test(entryFile);

	if (!entryFile) {
		console.log("Couldn't find entry file");
		process.exit();
	}

	let entryPart = entryFile;
	entryFile = path.join(testPath, entryFile);

	let pageTags = {};

	const inputOptions = {
		input: entryFile,
		plugins: [
			resolve(),
			babel({
				babelrc: false,
				presets: [
					[
						'@babel/env',
						{
							modules: false,
						},
					],
				],
				babelHelpers: 'bundled',
				plugins: ['@babel/plugin-proposal-optional-chaining', '@babel/plugin-proposal-nullish-coalescing-operator'],
			}),
			scss({
				// Filename to write all styles to
				output: function (styles) {
					let styleFile = entryPart.split('.');
					styleFile.pop();
					styleFile.push('css');
					fs.writeFileSync(path.resolve(buildDir, styleFile.join('.')), styles);
					pageTags.styles = styles;
				},
				// Determine if node process should be terminated on error (default: false)
				failOnError: true,
				// Get all style files with glob because scss plugin cannot handle them by it self
				watch: watch ? glob.sync(path.join(testPath, '**', '*.s*ss')) : undefined,
				// Prefix global scss. Useful for variables and mixins.
				// prefix: `@import "./fonts.scss";`,
				processor: () => postcss([autoprefixer]),
			}),
			alias({
				entries: [{ find: /^@\/(.*)/, replacement: path.join(__dirname, '$1') }],
			}),
		],
		watch: false,
	};

	const outputOptions = {
		dir: buildDir,
		strict: false,
		format: 'iife',
		plugins: [terser()],
	};

	const bundle = await rollup(inputOptions);

	// Do not write bundle to disk if it's just a style file. CSS will be written to disk by the scss plugin.
	if (stylesOnly) {
		await bundle.generate(outputOptions);
	} else {
		await bundle.write(outputOptions);
	}

	if (watch) {
		const watcher = rollupWatch({
			...inputOptions,
			output: outputOptions,
			watch: {
				buildDelay: 300,
				exclude: [path.join(testPath, '.build', '**')],
				include: [path.join(testPath, '**')],
				skipWrite: stylesOnly,
			},
		});

		watcher.on('event', async (event) => {
			if (event.code === 'END') {
				const { output } = await bundle.generate(outputOptions);

				for (const chunkOrAsset of output) {
					if (chunkOrAsset.type !== 'asset') {
						if (!pageTags.code) {
							pageTags.code = '';
						}
						pageTags.code += chunkOrAsset.code;
					}
				}

				await openBrowserTab(testConfig.url, pageTags);

				pageTags = {};
			}
			// event.code can be one of:
			//   START        — the watcher is (re)starting
			//   BUNDLE_START — building an individual bundle
			//   BUNDLE_END   — finished building a bundle
			//   END          — finished building all bundles
			//   ERROR        — encountered an error while bundling
		});
	} else {
		openBrowserTab(testConfig.url, pageTags);
	}
})();

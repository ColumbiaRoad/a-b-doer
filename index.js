const puppeteer = require('puppeteer-core');
const path = require('path');
const sass = require('node-sass');
const fs = require('fs');
const rollup = require('rollup').rollup;
const resolve = require('@rollup/plugin-node-resolve').default;
const babel = require('@rollup/plugin-babel').default;
const terser = require('rollup-plugin-terser').terser;

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

(async () => {
	let testPath = process.argv[2];
	if (!testPath) {
		console.log('Test folder is missing');
		process.exit();
	}
	testPath = path.resolve(testPath);

	const watch = process.env.PROJECT_WATCH === 'true';

	let steps = [];

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

	// Add step for styles
	const sassFile = path.join(testPath, 'styles.scss');
	try {
		if (fs.existsSync(sassFile)) {
			steps = steps.concat((args) => transformStyles(sassFile, args));
		}
	} catch (error) {}

	// Add step for javascript
	const jsFile = path.join(testPath, 'index.js');
	try {
		if (fs.existsSync(jsFile)) {
			steps = steps.concat((args) => transpileJs(jsFile, args));
		}
	} catch (error) {}

	// Final step that opens the browser
	steps = steps.concat((args) => openBrowserTab(testConfig.url, args));

	// Setup puppeteer
	const browser = await puppeteer.launch({
		headless: false,
		executablePath: config.browser,
	});

	let page = (await browser.pages())[0];
	if (!page) {
		page = await browser.newPage();
	}

	/**
	 * Recursively loops through all build steps
	 * @param {Array} steps
	 * @param {Object} args
	 */
	async function buildSteps(steps = [], args = {}) {
		const [step, ...rest] = steps;
		const ret = (await step(args)) || {};

		try {
			if (rest.length) {
				buildSteps(rest, {
					...args,
					...ret,
				});
			}
		} catch (error) {
			console.error(error);
		}
	}

	/**
	 * Transforms given sass file to css
	 * @param {String} sassFile
	 * @param {Object} args
	 */
	function transformStyles(sassFile, args) {
		const styles = sass.renderSync({
			file: sassFile,
		});

		fs.writeFileSync(path.resolve(buildDir, 'styles.css'), styles.css);

		return {
			...args,
			styles,
		};
	}

	/**
	 * Transpiles given js file to es5
	 * @param {String} jsFile
	 * @param {Object} args
	 */
	async function transpileJs(jsFile, args) {
		const inputOptions = {
			input: jsFile,
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
			],
			watch: false,
		};

		const outputOptions = {
			file: path.resolve(buildDir, 'bundle.js'),
			strict: false,
			format: 'iife',
			plugins: [terser()],
		};

		const bundle = await rollup(inputOptions);

		const { output } = await bundle.generate(outputOptions);

		let code = '';

		for (const chunkOrAsset of output) {
			if (chunkOrAsset.type !== 'asset') {
				code += chunkOrAsset.code;
			}
		}

		await bundle.write(outputOptions);

		return { ...args, js: code };
	}

	/**
	 * Opens a browser tab and injects all required styles and scripts to the DOM
	 * @param {String} url
	 * @param {Object} args
	 */
	async function openBrowserTab(url, args = {}) {
		console.log('Opening page "' + url + '"', 'with custom:', Object.keys(args));
		await page.goto(url);
		if (args.styles && args.styles.css) {
			await page.addStyleTag({ content: args.styles.css.toString() });
		}
		if (args.js) {
			await page.addScriptTag({ content: args.js });
		}
	}

	buildSteps(steps);

	if (watch) {
		fs.watch(
			testPath,
			{
				recursive: true,
			},
			() => {
				buildSteps(steps);
			}
		);
	}
})();

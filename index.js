const path = require('path');
const fs = require('fs');
const { rollup } = require('rollup');
const rollupWatch = require('rollup').watch;
const resolve = require('@rollup/plugin-node-resolve').default;
const babelPlugin = require('@rollup/plugin-babel').default;
const { terser } = require('rollup-plugin-terser');
const scss = require('rollup-plugin-scss');
const autoprefixer = require('autoprefixer');
const postcss = require('postcss');
const glob = require('glob');
const alias = require('@rollup/plugin-alias');
const replace = require('@rollup/plugin-replace');
const ejs = require('rollup-plugin-ejs');
const commonjs = require('@rollup/plugin-commonjs');
const { openBrowserTab, initBrowser } = require('./lib/puppeteer');

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

// Ensure build folder
const buildDir = path.join(testPath, '.build');
try {
	if (!fs.existsSync(buildDir)) {
		fs.mkdirSync(buildDir);
	}
} catch (error) {}

const watch = process.env.PROJECT_WATCH === 'true';

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

if (!entryFile) {
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
}

const babelConfig = {
	babelrc: false,
	presets: [
		[
			'@babel/env',
			{
				modules: false,
			},
		],
	],
	plugins: [
		'@babel/plugin-proposal-optional-chaining',
		'@babel/plugin-proposal-nullish-coalescing-operator',
		['@babel/plugin-transform-react-jsx', { pragma: 'jsx.ce', pragmaFrag: 'jsx.cf' }],
	],
	exclude: /core-js/,
};

/**
 * Async wrapper for the bundler and the bundle watcher.
 */
(async () => {
	// Bundler behaves a little bit differently when there's style file as an entry.
	let stylesOnly = /\.(sa|sc|c)ss$/.test(entryFile);

	if (!entryFile) {
		console.log("Couldn't find entry file");
		process.exit();
	}

	if (watch) {
		await initBrowser(config);
	}

	let entryPart = entryFile;
	entryFile = path.resolve(testPath, entryFile);

	const inputOptions = {
		input: [entryFile],
		plugins: [
			resolve(),
			babelPlugin({ ...babelConfig, babelHelpers: 'bundled' }),
			commonjs({ transformMixedEsModules: true }),
			scss({
				// Filename to write all styles to
				output: function (styles) {
					if (styles) {
						let styleFile = entryPart.split('.');
						styleFile.pop();
						styleFile.push('css');
						fs.writeFileSync(path.resolve(buildDir, styleFile.join('.')), styles);
					}
				},
				// Determine if node process should be terminated on error (default: false)
				failOnError: true,
				// Get all style files with glob because scss plugin cannot handle them by it self
				watch: watch
					? [].concat(glob.sync(path.join(testPath, '..', '*.s*ss')), glob.sync(path.join(testPath, '**', '*.s*ss')))
					: undefined,
				// Prefix global scss. Useful for variables and mixins.
				// prefix: `@import "./fonts.scss";`,
				processor: () => postcss([autoprefixer]),
			}),
			alias({
				entries: [{ find: /^@\/(.*)/, replacement: path.join(__dirname, '$1') }],
			}),
			ejs({
				include: ['**/*.ejs', '**/*.html'],
			}),
			replace({
				'process.env.NODE_ENV': JSON.stringify('production'),
			}),
		],
		watch: false,
	};

	const outputOptions = {
		dir: buildDir,
		strict: false,
		format: 'iife',
		intro: 'var jsx = {}',
		plugins: [
			testConfig.minify !== false &&
				terser({
					mangle: { toplevel: true },
				}),
		].filter(Boolean),
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
				skipWrite: stylesOnly,
			},
		});

		watcher.on('event', async (event) => {
			if (event.code === 'END') {
				await bundle.generate(outputOptions);
				await openBrowserTab(testConfig.url, buildDir, true);
			}
			// event.code can be one of:
			//   START        — the watcher is (re)starting
			//   BUNDLE_START — building an individual bundle
			//   BUNDLE_END   — finished building a bundle
			//   END          — finished building all bundles
			//   ERROR        — encountered an error while bundling
		});
	}
})();

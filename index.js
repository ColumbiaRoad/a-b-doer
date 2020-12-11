const path = require('path');
const fs = require('fs');
const { rollup } = require('rollup');
const rollupWatch = require('rollup').watch;
const resolve = require('@rollup/plugin-node-resolve').default;
const babelPlugin = require('@rollup/plugin-babel').default;
const { terser } = require('rollup-plugin-terser');
const styles = require('rollup-plugin-styles');
const stringHash = require('string-hash');
const autoprefixer = require('autoprefixer');
const alias = require('@rollup/plugin-alias');
const replace = require('@rollup/plugin-replace');
const ejs = require('rollup-plugin-ejs');
const commonjs = require('@rollup/plugin-commonjs');
const { openBrowserTab, initBrowser, getBrowserPage } = require('./lib/puppeteer');
const inlineSvg = require('rollup-plugin-inline-svg');
const svgImport = require('rollup-plugin-svg-hyperscript');
const image = require('@rollup/plugin-image');
const chunkImage = require('./lib/plugins/rollup-chunk-image');

/**
 * Load the config for the whole testing project
 */
let config = {
	chunkImages: true,
	minify: true,
	modules: true,
	preact: false,
};

try {
	const configPath = path.resolve(__dirname, 'config.json');
	if (fs.existsSync(configPath)) {
		Object.assign(config, require(configPath));
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

testConfig = { ...config, ...testConfig };

const { minify, preact, modules, id, chunkImages } = testConfig;

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
		'transform-async-to-promises',
		'@babel/plugin-proposal-class-properties',
		'@babel/plugin-proposal-optional-chaining',
		'@babel/plugin-proposal-nullish-coalescing-operator',
		['@babel/plugin-transform-react-jsx', { pragma: 'h', pragmaFrag: preact ? 'Fragment' : 'hf' }],
		[
			'@emotion/babel-plugin-jsx-pragmatic',
			preact
				? {
						module: 'preact',
						import: 'h, Fragment',
						export: 'h, Fragment',
				  }
				: {
						module: '@/lib/jsx',
						import: 'h, hf',
						export: 'h, hf',
				  },
		],
	].filter(Boolean),
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

	let entryPart = entryFile;
	entryFile = path.resolve(testPath, entryFile);

	let styleFile = entryPart.split('.');
	styleFile.pop();
	styleFile.push('css');
	styleFile = styleFile.join('.');

	const inputOptions = {
		input: [entryFile],
		plugins: [
			resolve(),
			babelPlugin({ ...babelConfig, babelHelpers: 'bundled' }),
			commonjs({ transformMixedEsModules: true }),
			styles({
				mode: ['extract', path.basename(styleFile)],
				minimize: minify,
				modules:
					modules !== false
						? {
								generateScopedName: minify
									? (name, file) => {
											const parentPath = path.dirname(path.dirname(file));
											file = file.replace(parentPath, '');
											return 't' + stringHash(file).toString(36).substr(0, 4) + '_' + name;
									  }
									: 't_[name]_[local]__[hash:4]',
						  }
						: undefined,
				plugins: [autoprefixer],
				url: { inline: true },
				alias: {
					scss: path.join(__dirname, '/scss'),
					sass: path.join(__dirname, '/sass'),
					less: path.join(__dirname, '/less'),
					styles: path.join(__dirname, '/styles'),
					css: path.join(__dirname, 'css'),
					'@': path.join(__dirname),
				},
			}),
			alias({
				entries: [
					{ find: /^@\/(.*)/, replacement: path.join(__dirname, '$1') },
					{ find: 'react', replacement: 'preact/compat' },
					{ find: 'react-dom', replacement: 'preact/compat' },
				],
			}),
			ejs({
				include: ['**/*.ejs', '**/*.html'],
			}),
			replace({
				'process.env.preact': !!preact,
				'process.env.NODE_ENV': JSON.stringify('production'),
				'process.env.TEST_ID': JSON.stringify(
					id || 't' + (hashf(path.dirname(testPath.replace(process.env.INIT_CWD, ''))).toString(36) || '-default')
				),
			}),
			image({
				exclude: ['**/*.svg'],
			}),
			chunkImage(chunkImages),
			preact
				? svgImport({
						importDeclaration: 'import {h} from "preact"',
						pragma: 'h',
						transformPropNames: false,
				  })
				: inlineSvg({
						removeSVGTagAttrs: false,
				  }),
		],
		watch: false,
	};

	const outputOptions = {
		dir: buildDir,
		assetFileNames: path.basename(styleFile),
		strict: false,
		format: 'iife',
		exports: 'named',
		name: path.basename(entryFile).split('.')[0],
		plugins: [
			minify &&
				terser(
					Object.assign(
						{
							mangle: { toplevel: true },
						},
						chunkImages && {
							compress: {
								evaluate: false,
							},
						}
					)
				),
		].filter(Boolean),
	};

	let bundle;

	try {
		// First try to create bundle before opening the browser.
		bundle = await rollup(inputOptions);

		if (watch) {
			browser = await initBrowser(testConfig);
		}
		await bundle.write(outputOptions);
	} catch (error) {
		console.log('\n\n\x1b[31m%s\x1b[0m', 'Bundle error!');
		console.error(error.message);
		process.exit();
	}

	const createBundle = () => {
		let js = '';
		let styles = '';

		try {
			// Remove dummy js generated by rollup
			if (stylesOnly) {
				let jsFile = entryPart.split('.');
				jsFile.pop();
				jsFile.push('js');
				fs.unlinkSync(path.resolve(buildDir, jsFile.join('.')));
			}
			// Include the js content
			else {
				js = fs.readFileSync(path.resolve(buildDir, entryPart), 'utf8');
			}
			let styleFile = entryPart.split('.');
			styleFile.pop();
			styleFile.push('css');
			styles = fs.readFileSync(path.resolve(buildDir, styleFile.join('.')), 'utf8');
		} catch (error) {}

		let bundle = js;
		if (styles) {
			bundle =
				'(function(){' +
				"var s=document.createElement('style');s.innerText='" +
				styles.replace(/[\r\n]/g, ' ').replace(/'/g, "\\'") +
				"';" +
				'document.head.appendChild(s);' +
				js +
				'})()';
		}

		fs.writeFileSync(path.resolve(buildDir, '.bundle.js'), bundle);
	};

	createBundle();

	if (watch) {
		const watcher = rollupWatch({
			...inputOptions,
			output: outputOptions,
			watch: {
				buildDelay: 300,
				exclude: [path.join(testPath, '.build', '**')],
			},
		});

		const page = await getBrowserPage(true);

		watcher.on('event', async (event) => {
			if (event.code === 'END' && bundle) {
				await bundle.generate(outputOptions);
				createBundle();
				await openBrowserTab(testConfig.url, buildDir, true);
			} else if (event.code === 'ERROR') {
				console.log('\n\x1b[31m%s\x1b[0m', 'Bundle error!');
				console.error(event.error.message, '\n');

				if (page) {
					page.evaluate((msg) => {
						console.log('\n\x1b[31m%s\x1b[0m', 'Bundle error!');
						console.warn(msg, '\n');
					}, event.error.message);
				}
			} else if (event.code === 'BUNDLE_START') {
				if (page) {
					page.evaluate(() => {
						console.log('\x1b[92m%s\x1b[0m', 'Source code changed. Starting bundler...');
					});
				}
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

function hashf(s) {
	let hash = 0;
	let strlen = s.length;

	if (strlen === 0) {
		return hash;
	}
	for (let i = 0; i < strlen; i++) {
		let c = s.charCodeAt(i);
		hash = (hash << 5) - hash + c;
		hash = hash & hash; // Convert to 32bit integer
	}
	return hash;
}

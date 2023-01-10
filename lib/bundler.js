export * from './puppeteer';
import chalk from 'chalk';
import fs from 'fs';
import glob from 'glob';
import path from 'path';
import replace from '@rollup/plugin-replace';
import rimraf from 'rimraf';
import svgr from 'vite-plugin-svgr';
import browserslist from 'browserslist';
import basicSsl from '@vitejs/plugin-basic-ssl';
import get from 'lodash.get';
import stringHash from 'string-hash';
import { fileURLToPath } from 'url';
import { build, createServer } from 'vite';
import prefresh from '@prefresh/vite';
import { getFlagEnv, hashf, unifyPath } from './utils';
import { openPage } from './puppeteer';
import { preactDebug } from './plugins/preact-debug-plugin';
import { cssInjectedByJsPlugin } from './plugins/css-inject-plugin';
import { cssModules } from './plugins/css-modules-plugin';
import { customJsxPrefreshPlugin } from './plugins/custom-jsx-prefresh-plugin';

// __dirname is not defined in ES module scope
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const browsers = browserslist();

const supportIE = !!browsers.find((b) => b.startsWith('ie'));

const rootDir = __dirname.replace(/(\/|\\)(dist|bin|lib).*/, '');

const cwd = process.cwd();

const DEV_SERVER_PORT = process.env.DEV_SERVER_PORT || 5173;

const defaultConfig = {
	bundler: {
		resolve: {
			alias: [
				{ find: /^@\/(.*)/, replacement: path.join(cwd, '$1') },
				{ find: 'react', replacement: 'preact/compat' },
				{ find: 'react-dom', replacement: 'preact/compat' },
				{ find: 'react/jsx-runtime', replacement: 'preact/jsx-runtime' },
			],
		},
	},
};

/**
 * @param {Awaited<ReturnType<import("./buildspec").default>>} buildSpecConfig
 * @returns {object} Bundler config
 */
export async function bundler(buildSpecConfig) {
	let { getBundlerConfig, getSpecConfig, ...restConfig } = buildSpecConfig;

	const testConfig = getSpecConfig({ ...defaultConfig, ...restConfig });

	let { entryFile, testPath, entry, entryPart, preview = false } = testConfig;

	if (!entryFile && entry) {
		entryFile = entry;
		if (entry.startsWith('.')) {
			entryFile = path.join(testPath, entry);
		}
	}

	if (!entryPart && entry) {
		entryPart = entry;
	}

	if (!entryFile || !testPath) {
		throw new Error('Entry file or test path is missing');
	}

	const buildDir = path.join(testPath, testConfig.buildDir);
	testConfig.buildDir = buildDir;

	// Ensure build folder
	try {
		if (!fs.existsSync(buildDir)) {
			fs.mkdirSync(buildDir);
		}
	} catch (error) {}

	const { minify: configMinify, preact, modules, id, chunks, extractCss, watch, features } = testConfig;
	const minify = configMinify ?? !watch;

	// Bundler behaves a little bit differently when there's style file as an entry.
	let stylesOnly = /\.(le|sa|sc|c)ss$/.test(entryFile);

	if (!entryFile) {
		throw new Error("Couldn't find entry file");
	}

	// Get parsed boolean values from some common process.env variables
	const PREACT = getFlagEnv('PREACT') ?? !!preact;
	const NODE_ENV = JSON.stringify(watch ? 'development' : 'production');
	const IE = getFlagEnv('IE') ?? supportIE;
	const PREVIEW = Boolean(watch || preview);
	const TEST_ENV = getFlagEnv('TEST_ENV') || false;
	const TEST_ID = id || 't' + (hashf(path.dirname(unifyPath(entryFile))).toString(36) || '-default');
	// Assign some common process.env variables for bundler/etc and custom rollup plugins
	process.env.PREACT = process.env.preact = PREACT;
	process.env.IE = IE;
	process.env.PREVIEW = PREVIEW;
	process.env.TEST_ENV = TEST_ENV;
	process.env.TEST_ID = TEST_ID;
	process.env.NODE_ENV = NODE_ENV;

	const featuresReplaces = {};
	Object.entries(features).forEach(([key, value]) => {
		if (value !== 'auto') {
			const letter = key === 'className' ? 'x' : key[0];
			featuresReplaces[`config.${letter}`] = value.toString();
		}
	});

	const chunksInputConfig = chunks
		? {
				preserveEntrySignatures: 'allow-extension',
				inlineDynamicImports: false,
		  }
		: {};

	const chunksOuputConfig = chunks
		? {
				format: 'system',
				name: '',
		  }
		: {
				format: 'iife',
		  };

	const outputOptions = {};

	const jsxInject = preact
		? 'import {h,Fragment} from "preact"'
		: `import {h,hf} from "${path.join(rootDir, '/src/jsx')}"`;

	const optimizeDeps = {
		exclude: [`@prefresh/vite/runtime`, `@prefresh/vite/utils`],
	};

	const bundlerConfig = getBundlerConfig({
		abConfig: {
			...testConfig,
			TEST_ID,
			stylesOnly,
			libDir: rootDir,
		},
		optimizeDeps: stylesOnly
			? {
					...optimizeDeps,
					entries: [entryFile],
			  }
			: optimizeDeps,
		esbuild: {
			jsx: 'transform',
			jsxFactory: 'h',
			jsxFragment: preact ? 'Fragment' : 'hf',
			jsxInject,
		},
		css: {
			modules: modules && {
				generateScopedName: (name, file, css) => {
					const hash = stringHash(unifyPath(file + css))
						.toString(36)
						.substring(0, 5);
					if (minify) {
						return `t${hash}-${name}`;
					} else {
						const folder = path.basename(path.dirname(file));
						const fileNameParts = path.basename(file).split('.').slice(0, -1);
						if (fileNameParts.at(-1) === 'module') fileNameParts.pop();
						return `t_${folder}_${fileNameParts.join('.')}_${name}__${hash}`;
					}
				},
			},
		},
		build: {
			lib: {
				name: 'entryPart',
				entry: [entryFile],
				formats: [chunksOuputConfig.format],
				fileName: () => getFileAs(path.basename(entryFile), stylesOnly ? 'css' : 'js'),
			},
			minify: minify ? 'terser' : false,
			terserOptions: minify
				? {
						mangle: { toplevel: true },
						format: { comments: false },
				  }
				: false,
			emptyOutDir: false,
			chunkSizeWarningLimit: 2048,
			rollupOptions: {
				input: [entryFile],
				treeshake: {
					propertyReadSideEffects: false,
					moduleSideEffects: true,
					tryCatchDeoptimization: false,
					unknownGlobalSideEffects: false,
					correctVarValueBeforeDeclaration: false,
				},
				...chunksInputConfig,
				output: {
					dir: buildDir,
					assetFileNames: '[name].css',
					strict: false,
					exports: 'named',
					name: path.basename(entryFile).split('.')[0],
					intro: minify && !stylesOnly ? 'const window = self; const document = window.document;' : '',
					...chunksOuputConfig,
				},
			},
		},
		clearScreen: false,
		...defaultConfig.bundler,
		plugins: getPluginsConfig(
			[
				['preact-debug'],
				['css-inject'],
				['css-modules'],
				[
					'replace',
					{
						preventAssignment: true,
						values: {
							'process.env.PREACT': PREACT,
							'process.env.preact': PREACT,
							'process.env.NODE_ENV': NODE_ENV,
							'process.env.IE': IE,
							'process.env.PREVIEW': PREVIEW,
							'process.env.TEST_ENV': TEST_ENV,
							'process.env.TEST_ID': JSON.stringify(TEST_ID),
							...featuresReplaces,
						},
					},
				],
				[
					'svgr',
					{
						exportAsDefault: true,
						svgrOptions: {
							jsxRuntime: 'automatic',
						},
						esbuildOptions: {
							jsxFactory: 'h',
							jsxFragment: preact ? 'Fragment' : 'hf',
							banner: jsxInject, // Use banner because jsxInject doesn't work
						},
						include: '**/*.svg',
					},
				],
				watch && preact ? ['prefresh'] : ['custom-prefresh'],
			].filter(Boolean),
			defaultConfig.bundler.plugins
		),
	});

	if (outputOptions.entryFileNames && !output.assetFileNames) {
		outputOptions.assetFileNames = getFileAs(outputOptions.entryFileNames, 'css');
	}

	const clearHashedAssets = () => {
		// Check for hashed file names
		if (/\[hash(]|:)/.test(outputOptions.entryFileNames) || chunks) {
			// Clear previous hashed files from the build folder.
			const files = glob.sync('**/*.?(js|css|map)', { cwd: buildDir, dot: true });
			files.forEach((file) => {
				rimraf(`${buildDir}/${file}`, (err) => {
					if (err) console.error(err);
				});
			});
		}
	};

	let assetBundle;
	let server;

	if (!watch) {
		clearHashedAssets();

		try {
			await build({
				root: testPath,
				...bundlerConfig,
			});
		} catch (error) {
			console.log(chalk.red('\nBundle error!'));
			throw new Error(error.message);
		}
	}
	// Otherwise start vite dev server
	else {
		const port = get(bundlerConfig, ['server', 'port'], DEV_SERVER_PORT);
		const serverConfig = bundlerConfig.server || {};

		console.log(chalk.cyanBright('\nStarting dev server'), 'port ' + port);
		console.log();

		server = await createServer({
			root: cwd,
			configFile: false,
			server: {
				port: port,
				https: true,
				cors: {
					origin: '*',
					methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
					preflightContinue: false,
					optionsSuccessStatus: 204,
				},
				watch: {
					ignored: [path.join(testConfig.buildDir, '**')],
				},
				...serverConfig,
			},
			...bundlerConfig,
			plugins: [
				basicSsl(),
				{
					name: 'a-b-doer:response-headers',
					configureServer: (server) => {
						server.middlewares.use((_req, res, next) => {
							res.setHeader('Access-Control-Request-Private-Network', 'true');
							res.setHeader('Access-Control-Allow-Private-Network', 'true');
							next();
						});
					},
				},
			]
				.concat(bundlerConfig.plugins)
				.filter(Boolean),
		});

		await server.listen();

		const moduleScripts = [
			`https://localhost:${port}/@vite/client`,
			`https://localhost:${port}${entryFile.replace(cwd, '')}`,
		];

		if (testConfig.toolbar) {
			moduleScripts.push(
				`https://localhost:${port}/${path.join(
					rootDir.replace(cwd, ''),
					'lib',
					'utils',
					'toolbar',
					'pptr-toolbar.jsx'
				)}`
			);
		}

		const injection = `!(() => { \ndocument.head.append(${moduleScripts
			.map((script) => `Object.assign(document.createElement('script'), { type: 'module', src: '${script}', })`)
			.join(', ')}); \n})();
		`;

		try {
			await openPage({ ...testConfig, assetBundle: { js: true, bundle: injection } }, true);
		} catch (error) {
			console.log('Error while opening page', error);
		}
	}
	return { ...testConfig, assetBundle, server };
}

/**
 * Returns given entry file path as some other extension.
 * @param {string} entryPart
 * @param {string} ext
 */
function getFileAs(entryPart, ext) {
	const entryPathArrWithoutExt = entryPart.split('.').slice(0, -1);
	return entryPathArrWithoutExt.concat(ext).join('.');
}

/**
 * Returns an array containing plugins for the bundler input configuration.
 * @param {Array<[string, {[key: string]: any}]>} defaults
 * @param {Array<[string, {[key: string]: any} | Function] | {[key]: any}>} [override]
 */
function getPluginsConfig(defaults, override = []) {
	const fns = {
		'css-inject': cssInjectedByJsPlugin,
		'css-modules': cssModules,
		'preact-debug': preactDebug,
		replace,
		svgr,
		prefresh,
		'custom-prefresh': customJsxPrefreshPlugin,
	};

	return defaults
		.map((plugin) => {
			if (!Array.isArray(plugin)) return plugin;
			const [key, options] = plugin;

			const fn = fns[key];

			const overridePlugin = override.find((op) => {
				if (!Array.isArray(op)) return false;
				return op[0] === key;
			});

			if (overridePlugin) {
				// Remove the found override plugin.
				override.splice(override.indexOf(overridePlugin), 1);
				// If plugin config is a function, call it with the original plugin config.
				if (typeof overridePlugin[1] === 'function') {
					return fn(overridePlugin[1](options));
				} else {
					return fn(overridePlugin[1]);
				}
			}
			return fn(options);
		})
		.concat(
			override.map((plugin) => {
				let fn = plugin;
				if (Array.isArray(fn)) {
					if (typeof fn[1] === 'function') {
						return fn[1]();
					}
					// Allow removal
					else if (fn[1] === null) {
						return null;
					} else {
						console.error(
							chalk.red(
								`There's no default plugin for ${chalk.bold(fn[0])}. Can't call default plugin with given argument `,
								fn[1]
							)
						);
						console.error(
							chalk.red(`Custom plugins should be inserted as objects or as a [string, function] tuple, got`),
							fn
						);
					}
				}
				if (typeof fn === 'function') {
					return fn();
				}
				return fn;
			})
		);
}

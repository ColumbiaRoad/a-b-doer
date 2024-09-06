export * from './puppeteer';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import replace from '@rollup/plugin-replace';
import svgr from 'vite-plugin-svgr';
import browserslist from 'browserslist';
import basicSsl from '@vitejs/plugin-basic-ssl';
import stringHash from 'string-hash';
import { fileURLToPath } from 'url';
import { build, createServer } from 'vite';
import prefresh from '@prefresh/vite';
import { get, getFlagEnv, hashf, unifyPath } from './utils';
import { openPage } from './puppeteer';
import { preactDebug } from './plugins/preact-debug-plugin';
import { cssInjectPlugin } from './plugins/css-inject-plugin';
import { cssModules } from './plugins/css-modules-plugin';
import { cssModulesServe } from './plugins/css-modules-serve-plugin';
import { customJsxPrefreshPlugin } from './plugins/custom-jsx-prefresh-plugin';
import { globSync } from 'glob';
import { rimrafSync } from 'rimraf';
import { createModifiablePlugin } from '../src/utils/bundler';

// __dirname is not defined in ES module scope
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const browsers = browserslist();

const supportIE = !!browsers.find((b) => b.startsWith('ie'));

const rootDir = __dirname.replace(/(\/|\\)(dist|bin|lib).*/, '');

const cwd = process.cwd();

const DEV_SERVER_PORT = process.env.DEV_SERVER_PORT || 5173;

const minifiedProperties = {
	__hooks: 'h',
	__class: 'c',
	__vnode: 'v',
	__current: 'i',
	__state: 's',
	__dirty: 'd',
	__children: 'a',
	__result: 'r',
	__dom: 'e',
	__delete: 'x',
};

/**
 * @param {Awaited<ReturnType<import("./buildspec").default>>} buildSpecConfig
 * @returns {object} Bundler config
 */
export function getBundlerConfigs(buildSpecConfig) {
	let { getBundlerConfig = (opts) => opts, getSpecConfig = (opts) => opts, ...restConfig } = buildSpecConfig;

	const testConfig = getSpecConfig(restConfig);

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

	const { minify: configMinify, preact, modules, id, chunks, watch, features, extractCss } = testConfig;
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
	const TEST_ENV = getFlagEnv('VITEST') || false;
	const TEST_ID = id || `t${hashf(path.dirname(unifyPath(entryFile))).toString(36) || '-default'}`;
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
			featuresReplaces[`config.${key}`] = value.toString();
		}
	});

	const chunksInputConfig = chunks
		? {
				preserveEntrySignatures: 'allow-extension',
		  }
		: {};

	const chunksOuputConfig = chunks
		? {
				format: 'es',
				manualChunks(id) {
					if (id.includes('node_modules') || /^vite\//.test(id)) return 'vendor';
				},
		  }
		: {
				format: 'iife',
		  };

	// const outputOptions = {};

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
					}
					const folder = path.basename(path.dirname(file));
					const fileNameParts = path.basename(file).split('.');
					return `t_${folder}_${fileNameParts.at(0)}__${name}--${hash}`;
				},
			},
		},
		build: {
			assetsDir: '',
			minify: minify ? 'terser' : false,
			terserOptions: minify
				? {
						mangle: { toplevel: true },
						format: { comments: false },
				  }
				: false,
			emptyOutDir: false,
			chunkSizeWarningLimit: 2048,
			cssCodeSplit: !extractCss && !stylesOnly,
			rollupOptions: {
				input: [entryFile],
				external: ['path', 'module', 'url'],
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
					entryFileNames: ({ name }) => {
						name = name.replace('.module', '');
						const nameParts = name.split('.');
						if (nameParts.length >= 2) {
							nameParts.pop();
						}
						return `${nameParts.join('.')}.${stylesOnly ? 'css' : 'js'}`;
					},
					assetFileNames: '[name].[ext]',
					exports: 'named',
					name: path.basename(entryFile).split('.')[0],
					intro: minify && !stylesOnly ? 'const window = self; const document = window.document;' : '',
					...chunksOuputConfig,
				},
			},
		},
		clearScreen: false,
		plugins: [
			!TEST_ENV && createModifiablePlugin(preactDebug, { name: 'a-b-doer:preact-debug' }),
			createModifiablePlugin(cssModules, { name: 'a-b-doer:css-modules' }),
			createModifiablePlugin(cssInjectPlugin, { name: 'a-b-doer:css-inject-plugin' }),
			createModifiablePlugin(cssModulesServe, { name: 'a-b-doer:css-modules-serve' }),
			createModifiablePlugin(replace, {
				name: 'replace',
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
			}),
			!TEST_ENV &&
				!watch &&
				!preact &&
				createModifiablePlugin(replace, {
					name: 'replace2',
					preventAssignment: false,
					delimiters: ['', ''],
					values: minifiedProperties,
				}),
			createModifiablePlugin(svgr, {
				name: 'vite-plugin-svgr',
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
			}),
			watch &&
				(preact
					? createModifiablePlugin(prefresh, { name: 'prefresh' })
					: createModifiablePlugin(customJsxPrefreshPlugin, { name: 'custom-prefresh' })),
		].filter(Boolean),
	});

	bundlerConfig.plugins = bundlerConfig.plugins
		.map((plugin) => {
			if (typeof plugin === 'function' && '__options__' in plugin) {
				return plugin(plugin.__options__);
			}
			return plugin;
		})
		.filter(Boolean);

	return { bundlerConfig, testConfig };
}

/**
 * @param {Awaited<ReturnType<import("./buildspec").default>>} buildSpecConfig
 * @returns {object} Bundler config
 */
export async function bundler(buildSpecConfig) {
	const { bundlerConfig, testConfig } = getBundlerConfigs(buildSpecConfig);
	const { watch, testPath, entryFile, buildDir, chunks } = testConfig;

	// Ensure build folder
	try {
		if (!fs.existsSync(buildDir)) {
			fs.mkdirSync(buildDir);
		}
	} catch (error) {
		//
	}

	// if (outputOptions.entryFileNames && !output.assetFileNames) {
	// 	outputOptions.assetFileNames = getFileAs(outputOptions.entryFileNames, 'css');
	// }

	const clearHashedAssets = () => {
		// Check for hashed file names
		if (/\[hash(]|:)/.test(get(bundlerConfig, 'build.rollupOptions.output.entryFileNames', '')) || chunks) {
			// Clear previous hashed files from the build folder.
			const files = globSync('**/*.?(js|css|map)', { cwd: buildDir, dot: true });
			files.forEach((file) => {
				rimrafSync(`${buildDir}/${file}`);
			});
		}
	};

	let assetBundle;
	let server;

	if (!watch) {
		clearHashedAssets();

		try {
			let result = await build({
				root: testPath,
				...bundlerConfig,
			});

			if (!Array.isArray(result)) {
				result = [result];
			}

			// Create assetBundle for output so tests could use them.
			const mainChunk = result.at(0).output.at(0);
			let code = mainChunk.code;
			// Css only bundles should have injectable js code
			if (!code && mainChunk.source) {
				code = `(()=>{document.head.appendChild(Object.assign(document.createElement('style'),{innerHTML:\`${mainChunk.source}\`}))})();`;
			}
			assetBundle = { js: true, bundle: code };
		} catch (error) {
			console.log(chalk.red('\nBundle error!'));
			throw new Error(error.message);
		}
	}
	// Otherwise start vite dev server
	else {
		let port = get(bundlerConfig, ['server', 'port'], DEV_SERVER_PORT);
		const serverConfig = bundlerConfig.server || {};

		console.log(chalk.cyanBright('\nStarting dev server'), `port ${port}`);
		console.log();

		server = await createServer({
			root: cwd,
			configFile: false,
			server: {
				port,
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

		const startedPort = server.httpServer.address().port;
		if (startedPort !== port) {
			port = startedPort;
			console.log(chalk.cyanBright('Started dev server'), `port ${port}`);
			console.log('');
		}

		let moduleScripts = [
			`https://localhost:${port}/@vite/client`,
			`https://localhost:${port}${entryFile.replace(cwd, '')}`,
		];

		if (testConfig.toolbar) {
			moduleScripts.push(
				`https://localhost:${port}/${path.join(rootDir.replace(cwd, ''), 'dist', 'lib', 'pptr-toolbar.js')}`
			);
		}

		// turns '\\' -> '/' and '//' -> '/' but not '://' into '/'
		moduleScripts = moduleScripts.map((scriptUrl) => scriptUrl.replaceAll('\\', '/').replaceAll(/(?<!:)\/\/+/g, '/'));

		const injection = `!(() => { \ndocument.head.append(${moduleScripts
			.map((script) => `Object.assign(document.createElement('script'), { type: 'module', src: '${script}', })`)
			.join(', ')}); \n})();
		`;

		assetBundle = {
			js: true,
			bundle: injection,
			// Expose entry file for page events so it can be used when inserting
			entryFile: entryFile.replace(process.cwd(), ''),
		};

		try {
			await openPage({ ...testConfig, assetBundle, bundlerConfig }, true);
		} catch (error) {
			console.log('Error while opening page', error);
		}
	}
	return { ...testConfig, assetBundle, server, bundlerConfig };
}

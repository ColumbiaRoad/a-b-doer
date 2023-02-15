import path from 'path';
import fs from 'fs';
import { createFilter } from '@rollup/pluginutils';
import get from 'lodash.get';
import set from 'lodash.set';
import { createRequire } from 'module';
import { convertToEsmPath } from './utils';

// Require is not defined in ES module scope
const specRequire = createRequire(import.meta.url);

/**
 * Config defaults
 */
export const config = {
	buildDir: '.build',
	chunks: false,
	devtools: true,
	historyChanges: true,
	modules: true,
	preact: false,
	sourcemap: true,
	watch: false,
	windowSize: [1920, 1080],
	toolbar: false,
	extractCss: false,
	features: {
		hooks: true,
		jsx: true,
		className: true,
		classComponent: true,
		namespace: true,
		extendedVnode: true,
	},
};

/**
 * @param {string} configPath
 * @returns {object | () => object}
 */
async function getConfigFileJsonOrJSContent(configPath) {
	const fileDir = path.dirname(configPath);
	const fileWithoutExt = path.basename(configPath, '.json');
	const configPathJs = path.resolve(fileDir, `${fileWithoutExt}.js`);
	if (fs.existsSync(configPath)) {
		// Clear require cache before loading the file
		delete specRequire.cache[configPath];
		return { file: configPath, config: specRequire(configPath) };
	} else if (fs.existsSync(configPathJs)) {
		// Import file with a cache buster
		const { default: configMod } = await import(
			`${convertToEsmPath(configPathJs)}?cb=${Math.random().toString(36).substring(3)}`
		);
		return { file: configPathJs, config: configMod };
	}
	return {};
}

/**
 * @param  {...string[]} specConfigPaths
 * @returns {Promise<Array<{file: string, config: object}>}
 */
async function getValidatedSpecs(...specConfigPaths) {
	const specs = await Promise.all(
		specConfigPaths.map(async (configPath) => {
			const specConfig = await getConfigFileJsonOrJSContent(configPath);
			if (!Object.keys(specConfig).length || !['function', 'object'].includes(typeof specConfig.config)) {
				return;
			}
			return {
				...specConfig,
				config: typeof specConfig.config === 'function' ? specConfig() : specConfig.config,
			};
		})
	);
	return specs.filter(Boolean);
}

/**
 * Returns a build spec object for given test path
 * @param {string} testPath
 */
async function getBuildSpec(testPath) {
	if (!testPath) {
		console.log('Test folder is missing');
		process.exit();
	}

	let entryFile = '';

	try {
		// If the test path argument is a file, use it as an entry
		if (!fs.lstatSync(testPath).isDirectory()) {
			let testDir = path.dirname(testPath);
			entryFile = testPath.replace(testDir, '.');
			testPath = testDir;
		}
	} catch (error) {
		console.error(error);
		process.exit();
	}

	if (!fs.existsSync(testPath)) {
		console.log('Test folder does not exist', testPath);
		process.exit();
	}

	// Check & load build related data
	const testConfig = {
		specs: [],
	};

	try {
		testConfig.specs = await getValidatedSpecs(
			path.resolve(process.cwd(), 'config.json'),
			path.join(testPath, '..', '..', 'buildspec.json'),
			path.join(testPath, '..', 'buildspec.json'),
			path.join(testPath, 'buildspec.json')
		);
	} catch (error) {
		console.error(error);
	}

	// Empty config object or the buildspec.json is missing
	if (!testConfig.specs.length) {
		return null;
	}

	const getSpecConfig = (propertyPath, defaultOptions) => {
		return testConfig.specs.reduce(
			(acc, spec) => {
				const config = get(spec, propertyPath);
				if (config) {
					Object.keys(config).forEach((key) => {
						if (key === 'bundler') return;
						let option = config[key];
						const accVal = get(acc, [key]);
						if (typeof option === 'object' && option) {
							if (option._extended) {
								option = option.callback(accVal);
							}
						}
						set(acc, [key], option);
					});
				}
				if (acc.url && !Array.isArray(acc.url)) {
					acc.url = [acc.url];
				}
				return acc;
			},
			{ ...defaultOptions }
		);
	};

	return {
		...testConfig,
		getSpecConfig: (options = {}) => {
			const specConfig = getSpecConfig('config', {
				...config,
				...options,
				testPath,
			});

			if (!entryFile) {
				if (specConfig.entry) {
					entryFile = specConfig.entry;
				} else {
					const files = fs.readdirSync(testPath, { encoding: 'utf8' });
					// Find first index file
					const indexFile = files.find((file) => /index\.(jsx?|tsx?|(le|sa|sc|c)ss)$/.test(file));
					if (indexFile) {
						entryFile = indexFile;
					}
					// Try some style file
					else {
						entryFile = files.find((file) => /styles?\.(le|sa|sc|c)ss$/.test(file));
					}
				}
			}

			let entryPart = entryFile;
			if (entryFile) {
				entryFile = path.resolve(testPath, entryFile);
			}

			if (!entryFile) return null;

			// Check that given entry is not excluded.
			const filter = createFilter(specConfig.include, specConfig.exclude);
			if (!filter(entryFile)) {
				return null;
			}

			return {
				...specConfig,
				bundler: null,
				features: {
					...config.features,
					...specConfig.features,
					...(specConfig.preact ? { jsx: false, hooks: false } : {}),
				},
				entryFile,
				entryPart,
				entryFileExt: entryFile.split('.').pop(),
			};
		},
		getBundlerConfig(options = {}) {
			return getSpecConfig('config.bundler', {
				resolve: {
					alias: [
						{ find: /^@\/(.*)/, replacement: path.join(process.cwd(), '$1') },
						{ find: 'react', replacement: 'preact/compat' },
						{ find: 'react-dom', replacement: 'preact/compat' },
						{ find: 'react/jsx-runtime', replacement: 'preact/jsx-runtime' },
					],
				},
				...options,
			});
		},
	};
}

export default getBuildSpec;

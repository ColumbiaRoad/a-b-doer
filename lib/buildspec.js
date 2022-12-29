import path from 'path';
import fs from 'fs';
import { createFilter } from '@rollup/pluginutils';
import get from 'lodash.get';
import set from 'lodash.set';
import merge from 'lodash.merge';
import { createRequire } from 'module';
import { convertToEsmPath } from './utils';

// Require is not defined in ES module scope
const specRequire = createRequire(import.meta.url);

/**
 * Config defaults
 */
export const config = {
	appendStyles: true,
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
		hooks: 'auto',
		jsx: 'auto',
		classes: true,
		className: true,
		namespaces: true,
	},
};

/**
 * @param {string} configPath
 * @returns {object | () => object)}
 */
async function getConfigFileJsonOrJSContent(configPath) {
	const fileDir = path.dirname(configPath);
	const fileWithoutExt = path.basename(configPath, '.json');
	const configPathJs = path.resolve(fileDir, fileWithoutExt + '.js');
	if (fs.existsSync(configPath)) {
		// Clear require cache before loading the file
		delete specRequire.cache[configPath];
		return specRequire(configPath);
	} else if (fs.existsSync(configPathJs)) {
		// Import file with a cache buster
		const { default: configMod } = await import(
			convertToEsmPath(configPathJs) + '?cb=' + Math.random().toString(36).substring(3)
		);
		return configMod;
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
			if (!['function', 'object'].includes(typeof specConfig) || !Object.keys(specConfig).length) {
				return;
			}
			return {
				file: configPath,
				config: typeof specConfig === 'function' ? specConfig() : specConfig,
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

	if (!entryFile) {
		if (testConfig.entry) {
			entryFile = testConfig.entry;
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
	const filter = createFilter(testConfig.include, testConfig.exclude);
	if (!filter(entryFile)) {
		return null;
	}

	return {
		...config,
		...testConfig,
		features: { ...config.features, ...(testConfig.features || {}) },
		testPath,
		entryFile,
		entryPart,
		entryFileExt: entryFile.split('.').pop(),
		getSpecConfig(options) {
			return testConfig.specs.reduce(
				(acc, spec) => {
					Object.keys(spec.config).forEach((key) => {
						if (key === 'bundler') return;
						const option = spec.config[key];
						if (typeof option === 'function') {
							set(acc, [key], option(get(acc, [key])));
						} else if (typeof option === 'object' && option) {
							set(acc, [key], merge(get(acc, [key]), option));
						} else {
							set(acc, [key], option);
						}
					});
					if (acc.url && !Array.isArray(acc.url)) {
						acc.url = [acc.url];
					}
					return acc;
				},
				{ ...options }
			);
		},
		getBundlerConfig(config) {
			return testConfig.specs.reduce(
				(acc, spec) => {
					const bundlerConfig = get(spec, ['config', 'bundler']);
					if (bundlerConfig) {
						Object.keys(bundlerConfig).forEach((key) => {
							const option = bundlerConfig[key];
							if (typeof option === 'function') {
								set(acc, [key], option(get(acc, [key])));
							} else if (typeof option === 'object' && option) {
								set(acc, [key], merge(get(acc, [key]), option));
							} else {
								set(acc, [key], option);
							}
						});
					}
					return acc;
				},
				{ ...config }
			);
		},
	};
}

export default getBuildSpec;

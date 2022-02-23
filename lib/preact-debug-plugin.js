import { readFileSync } from 'fs';
import { getFlagEnv } from './utils';

/**
 * Enables preact debug module. This plugin is required because there's another plugin that
 * automatically imports h & Fragment and debug module must be imported before them.
 */
export function preactDebug() {
	return {
		name: 'preact-debug',
		async resolveId(source, importer) {
			// Is root level import?
			if (!importer) {
				// We need to skip this plugin to avoid an infinite loop
				const resolution = await this.resolve(source, undefined, { skipSelf: true });
				// If it cannot be resolved, return `null` so that Rollup displays an error
				if (!resolution) return null;
				return resolution;
			}
			return null;
		},
		load(id) {
			// Prepend preact debug module to the imported code
			if (!getFlagEnv('TEST_ENV') && this.getModuleInfo(id).isEntry && getFlagEnv('PREACT') && getFlagEnv('PREVIEW')) {
				const contents = readFileSync(id).toString();
				return `import "preact/devtools";\n${contents};`;
			}
			return null;
		},
	};
}

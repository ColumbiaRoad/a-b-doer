import { readFileSync } from 'fs';
let isRoot = false;

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
				isRoot = true;
				return resolution;
			}
			isRoot = false;
			return null;
		},
		load(id) {
			// Prepend preact debug module to the imported code
			if (isRoot && process.env.PREACT && process.env.PREVIEW) {
				const contents = readFileSync(id).toString();
				return `import "preact/debug";\n${contents};`;
			}
			return null;
		},
	};
}

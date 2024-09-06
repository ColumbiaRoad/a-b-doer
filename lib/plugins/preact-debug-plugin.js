/**
 * Enables preact debug module. This plugin is required because there's another plugin that
 * automatically imports h & Fragment and debug module must be imported before them.
 */
export function preactDebug() {
	let entry = '';
	let config = {};

	return {
		name: 'a-b-doer:preact-debug',
		enforce: 'pre',
		configResolved(resolvedConfig) {
			config = resolvedConfig;
		},
		resolveId(id, importer) {
			if (!importer && !entry) {
				entry = id;
			}
		},
		transform(code, id) {
			if (entry === id && config.command === 'serve') {
				code = `import "preact/devtools";\n${code};`;
			}
			return code;
		},
	};
}

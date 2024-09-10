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
		async resolveId(source, importer, options) {
			const resolution = await this.resolve(source, importer, { skipSelf: true, ...options });
			if (!resolution?.id) return;
			const id = resolution.id.split('?').at(0);
			if (!entry && config?.abConfig?.entryFile === id) {
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

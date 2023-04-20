import isMatch from 'lodash.ismatch';

export const extendConfig = (callback) => ({
	_extended: true,
	callback,
});

export class PluginsPattern extends Array {
	constructor(items = []) {
		if (!Array.isArray(items)) {
			items = [items];
		}
		super(...items);
	}

	match(matchObj, fn) {
		const allNames = this.map((plugin) => plugin.__name__).filter(Boolean);
		if (matchObj.name && !allNames.includes(matchObj.name)) {
			console.error(
				`\nUnsupported plugin name used in pattern match "${matchObj.name}". Supported names that are not already matched:`
			);
			console.error(allNames.join(', '));
			process.exit(1);
		}
		return new PluginsPattern(
			this.map((plugin) => {
				const options = plugin.__options__ || {};
				if (isMatch({ ...options, name: plugin.__name__ }, matchObj)) {
					return fn({ plugin: plugin.__fn__, options });
				}
				return plugin;
			})
		);
	}
}

/**
 * Creates a modifiable vite plugin from given plugin and plugin options.
 * Returned function can be matched with PluginsPattern when extending the bundler config.
 * @param {Function} pluginFn
 * @param {Object} pluginOptions
 * @returns {Function}
 */
export function createModifiablePlugin(pluginFn, pluginOptions) {
	const bound = pluginFn.bind(null);
	bound.__fn__ = pluginFn;
	bound.__name__ = pluginOptions.name || pluginFn.name;
	delete pluginOptions.name;
	bound.__options__ = pluginOptions;
	return bound;
}

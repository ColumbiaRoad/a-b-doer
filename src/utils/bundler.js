import isMatch from 'lodash.ismatch';

export const extendConfig = (callback) => ({
	_extended: true,
	callback,
});

export const pluginsPattern = (plugins) => {
	const pluginsArray = [...plugins];
	Object.defineProperty(pluginsArray, 'match', {
		enumerable: false,
		value: (match, fn) => {
			const allNames = pluginsArray.map((plugin) => plugin.__name__).filter(Boolean);
			if (match.name && !allNames.includes(match.name)) {
				console.error(
					`\nUnsupported plugin name used in pattern match "${match.name}". Supported names that are not already matched:`
				);
				console.error(allNames.join(', '));
				process.exit(1);
			}
			return pluginsPattern(
				pluginsArray.map((plugin) => {
					const options = plugin.__options__ || {};
					if (isMatch({ ...options, name: plugin.__name__ }, match)) {
						return fn({ plugin: plugin.__fn__, options });
					}
					return plugin;
				})
			);
		},
	});
	return pluginsArray;
};

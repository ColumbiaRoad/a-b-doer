/** Based on amd-lite, modified to our needs
 * @see https://github.com/zouloux/amd-lite
 */

(function () {
	if (window.define && window.require) return;

	const waiting = {};
	const ready = {};

	/**
	 * Register module
	 * @param {String} name
	 * @param {Array<String>} dependencies
	 * @param {Function} callback
	 */
	function define(name, dependencies, callback) {
		name = normalize(name);
		if (!waiting[name] && !ready[name]) {
			waiting[name] = {
				deps: dependencies,
				cb: callback,
			};
		}
	}

	/**
	 * Require module
	 * @param {Array<String>} dependencyNames
	 * @param {Function} callback
	 */
	function require(dependencyNames, callback) {
		const dependencies = resolveAll(dependencyNames);
		if (callback) callback.apply(null, dependencies);
	}

	/**
	 * Resolves the given dependency
	 * @param {String} dep
	 * @returns {Function | null}
	 */
	function resolve(dep) {
		dep = normalize(dep);
		// Special case : require
		if (dep === 'require') {
			return require;
		}
		// Special case : exports statement
		else if (dep === 'exports') {
			return {};
		}

		const readyDep = ready[dep];
		if (readyDep) {
			return readyDep;
		}

		// Get module building info from waiting list
		const moduleToBuild = waiting[dep];
		if (moduleToBuild) {
			// Resolve waiting module dependencies recursively
			const dependencies = resolveAll(moduleToBuild.deps);

			// Call module callback with resolved dependencies
			const callbackReturn = moduleToBuild.cb.apply(null, dependencies);

			// Get index for exports statement
			const exportsIndex = moduleToBuild.deps.indexOf('exports');

			// We try to get module public API.
			// It can be inside "exports" parameter or in callback return statement.
			const buildModule =
				// No export, we return the callback return for maximum compatibility
				// Can be null
				exportsIndex === -1
					? callbackReturn
					: // Retrieve exports object from its index
					  // Module public API is this very object
					  // Can't be null but can be empty
					  dependencies[exportsIndex];

			// Register this module as ready
			ready[dep] = buildModule;
			delete waiting[dep];

			// Return module
			return buildModule;
		}

		return null;
	}

	function normalize(name) {
		return name.startsWith('./') ? name.substr(2) : name;
	}

	function resolveAll(deps) {
		return deps.map(resolve);
	}

	window.define = define;
	window.require = require;
})();

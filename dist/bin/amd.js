/** Based on amd-lite, modified to our needs
 * @see https://github.com/zouloux/amd-lite
 */

(function () {
	if (window.define && window.require) return;

	const waiting = {};
	const ready = {};
	const loaded = {};

	window.abdo = window.abdo || {};
	if (!window.abdo.loadScript) {
		// Overridable resolve script that can be used to load the dependency script
		window.abdo.loadScript = (dep) => Promise.resolve(dep);
	}

	/**
	 * Register module
	 * @param {String} name
	 * @param {Array<String>} dependencies
	 * @param {Function} callback
	 */
	function define(name, dependencies, callback) {
		name = normalize(name);
		loaded[name] = true;
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
		resolveAll(dependencyNames).then((dependencies) => {
			if (callback) callback.apply(null, dependencies);
		});
	}

	/**
	 * Resolves the given dependency
	 * @param {String} dep
	 * @returns {Function | null}
	 */
	function resolveDep(dep) {
		return new Promise((resolve) => {
			dep = normalize(dep);

			// Special case : require
			if (dep === 'require') {
				return resolve(require);
			}
			// Special case : exports statement and module (latter is a workaround)
			else if (dep === 'exports' || dep === 'module') {
				return resolve({});
			}

			const readyDep = ready[dep];
			if (readyDep) {
				return resolve(readyDep);
			}

			if (!loaded[dep]) {
				window.abdo.loadScript(dep).then(() => {
					loaded[dep] = true;
					resolveDep(dep).then(resolve);
				});
			} else {
				// Get module building info from waiting list
				const moduleToBuild = waiting[dep];
				if (moduleToBuild) {
					// Resolve waiting module dependencies recursively
					resolveAll(moduleToBuild.deps).then((dependencies) => {
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
						resolve(buildModule);
					});
				}
			}

			return null;
		});
	}

	function normalize(name) {
		return name.startsWith('./') ? name.substr(2) : name;
	}

	function resolveAll(deps) {
		return Promise.all(deps.map(resolveDep));
	}

	window.define = define;
	window.require = require;
})();

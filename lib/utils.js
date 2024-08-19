import { createRequire } from 'module';
const specRequire = createRequire(import.meta.url);

export function getFlagEnv(name) {
	const val = process.env[name];
	if (val === true || val === 'true') return true;
	if (val === 'false' || val === 'false') return false;
	return undefined;
}

export function hashf(s) {
	let hash = 0;
	let strlen = s.length;

	if (strlen === 0) {
		return hash;
	}
	for (let i = 0; i < strlen; i++) {
		let c = s.charCodeAt(i);
		hash = (hash << 5) - hash + c;
		hash = hash & hash; // Convert to 32bit integer
	}
	return hash;
}

/**
 * @param {string} path
 * @returns {string}
 */
export function unifyPath(path) {
	return path.replace(process.cwd(), '').replace(/\\/g, '/');
}

/**
 * Converts given file path to format that is supported by different environments (Win uses file urls).
 * @param {String} path
 * @returns {String}
 */
export function convertToEsmPath(path) {
	/* need to prepend configPath with file:// if function receives a Windows path */
	if (process.platform == 'win32' && !path.startsWith('file://')) {
		return specRequire('url').pathToFileURL(path).href;
	}
	return path;
}

/**
 * Gets the value at path of object. If the resolved value is undefined.
 * @param {*} value
 * @param {string|Array<string|number>} path
 * @param {*} [defaultValue]
 * @returns {*}
 */
export function get(value, path, defaultValue) {
	if (typeof value !== 'object' || value === null) {
		return defaultValue;
	}
	const pathArray = Array.isArray(path) ? path : String(path).split('.');
	return pathArray.reduce((acc, v) => {
		try {
			acc = acc[v] === undefined ? defaultValue : acc[v];
		} catch (e) {
			return defaultValue;
		}
		return acc;
	}, value);
}

/**
 * Gets the value at path of object. Method modifies the given object.
 * @param {*} obj
 * @param {string|Array<string|number>} path
 * @param {*} value
 */
export function set(obj, path, value) {
	if (typeof obj !== 'object' || obj === null) {
		return;
	}
	const pathArray = Array.isArray(path) ? path : String(path).split('.');
	pathArray.reduce((acc, v, i, arr) => {
		try {
			if (i === arr.length - 1) {
				acc[v] = value;
			} else if (acc[v] === undefined) {
				acc[v] = isNaN(+v) ? {} : [];
			}
		} catch (e) {
			// continue regardless of error
		}
		return acc[v];
	}, obj);
}

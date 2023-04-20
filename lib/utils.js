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

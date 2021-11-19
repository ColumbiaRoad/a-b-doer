// Just for smaller bundles. Google Optimize has 20kb limit for JS so every character counts :D
export function domAppend(parent, child) {
	parent.appendChild(child);
}
export function domInsertBefore(parent, child, target) {
	parent.insertBefore(child, target);
}
export function domRemove(parent, child) {
	parent.removeChild(child);
}
export function isFunction(fn) {
	return typeof fn === 'function';
}
export function isString(str) {
	return typeof str === 'string';
}
export function createDocumentFragment() {
	return document.createDocumentFragment();
}

// Internal object for storing details of currently rendered component's hooks
export const hooks = {
	c: 0,
	h: [],
	v: null,
};

export function isSame(iter, iter2) {
	let same = true;
	for (const key of Object.keys(iter)) {
		if (iter[key] !== iter2[key]) {
			same = false;
			break;
		}
	}
	return same;
}

export function onNextTick(callback) {
	setTimeout(callback, 0);
}

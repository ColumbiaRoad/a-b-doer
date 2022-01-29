// Just for smaller bundles. Google Optimize has 20kb limit for JS so every character counts :D
export function domAppend(parent, child) {
	parent.append(child);
}
export function domInsertBefore(child, target) {
	if (target?.parentElement) {
		target.parentElement.insertBefore(child, target);
	}
}
export function domRemove(node) {
	if (node?.parentElement) {
		node.parentElement.removeChild(node);
	}
}
export function domReplaceWith(oldNode, newNode) {
	if (oldNode?.parentElement) {
		oldNode.parentElement.replaceChild(newNode, oldNode);
	}
}
export function isFunction(fn) {
	return typeof fn === 'function';
}
export function isString(str) {
	return typeof str === 'string';
}
export function isArray(arr) {
	return Array.isArray(arr);
}
export function createDocumentFragment() {
	return document.createDocumentFragment();
}

// Internal object for storing details of current output/etc
/**
 * @prop {boolean} j Internal jsx support flag
 * @prop {boolean} c Internal class component support flag
 * @prop {boolean} h Internal hooks support flag
 * @prop {boolean} n Internal namespace tag/attribute support flag
 */
export const config = {
	c: true, // Classes. Helps terser to detect if class component support should be bundled
	h: false, // Hooks. Helps terser to detect if hook related code should be bundled
	j: false, // JSX. Helps terser to detect if jsx support should be bundled
	n: true, // Namespaces. Helps terser to detect if namespace tag/attribute support should be bundled.
};

// Internal object for storing details of currently rendered component's hooks
export const hooks = {
	c: 0,
	h: [],
	v: null,
};

export function isSame(iter, iter2) {
	let same = true;
	for (const key of Object.keys(iter)) {
		if (iter[key] !== iter2?.[key]) {
			same = key === 'props' ? isSame(iter[key], iter2?.[key]) : false;
			break;
		}
	}
	return same;
}

export function onNextTick(callback) {
	setTimeout(callback, 0);
}

export function createVNode(tag = '', props) {
	return {
		type: tag,
		props,
		key: props.key || props['data-o'] || process.env.TEST_ID,
	};
}

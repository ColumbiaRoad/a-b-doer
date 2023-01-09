// Just for smaller bundles. Google Optimize has 20kb limit for JS so every character counts :D
export const domAppend = (parent, child) => {
	parent.append(child);
};

const getParent = (node) => node?.parentElement;

export const domInsertBefore = (child, target) => {
	const parent = getParent(target);
	parent && parent.insertBefore(child, target);
};

export const domRemove = (node) => {
	const parent = getParent(node);
	parent && parent.removeChild(node);
};

export const domReplaceWith = (oldNode, newNode) => {
	const parent = getParent(oldNode);
	parent && parent.replaceChild(newNode, oldNode);
};

export const isFunction = (fn) => typeof fn === 'function';

export const isString = (str) => typeof str === 'string';

export const isArray = (arr) => Array.isArray(arr);

export const createDocumentFragment = () => document.createDocumentFragment();

// Internal object for storing details of current output/etc
/**
 * @prop {boolean} j Internal jsx support flag
 * @prop {boolean} c Internal class component support flag
 * @prop {boolean} h Internal hooks support flag
 * @prop {boolean} n Internal namespace tag/attribute support flag
 * @prop {boolean} x Internal class as className props support flag
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

export const isSame = (iter, iter2) => {
	if (iter === iter2) return true;
	if (iter && typeof iter === 'object') {
		let same = true;
		for (const key of Object.keys(iter)) {
			if (iter[key] !== iter2?.[key]) {
				same = key === 'props' ? isSame(iter[key], iter2?.[key]) : false;
				break;
			}
		}
		return same;
	} else {
		return false;
	}
};

export const onNextTick = (callback) => {
	setTimeout(callback, 0);
};

export const createVNode = (tag = '', props) => {
	return {
		type: tag,
		props,
		key: props.key || props['data-o'] || process.env.TEST_ID,
	};
};

export const options = {
	vnode: (vnode) => {},
	unmount: (vnode) => {},
};

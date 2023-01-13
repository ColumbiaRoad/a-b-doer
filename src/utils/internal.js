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
// This is just a placeholder object, all properties will be replaced to booleans with replace plugin.
/**
 * @prop {boolean} _jsx Internal jsx support flag
 * @prop {boolean} _classComponent Internal class component support flag
 * @prop {boolean} _hooks Internal hooks support flag
 * @prop {boolean} _namespace Internal namespace tag/attribute support flag
 * @prop {boolean} _className Internal class as className props support flag
 * @prop {boolean} _extendedVnode Internal extended VNode type support (DOM element & HTML string)
 */
export const config = {};

/**
 * Internal object for storing details of currently rendered component's hooks.
 * Hook pointer properties:
 * @prop {boolean} __current Currently processed hook index
 * @prop {boolean} __hooks Array pointer to current VNode's hooks
 * @prop {boolean} __vnode Current VNode
 */
export const hooks = {
	__current: 0,
	__hooks: [],
	__vnode: null,
};

export const isSame = (iter, iter2) => {
	if (iter === iter2) return true;
	if ((!iter && iter2) || (iter && !iter2)) return false;
	iter2 = iter2 || {};
	if (iter && typeof iter === 'object') {
		let same = true;
		const keys = [...new Set(Object.keys(iter), Object.keys(iter2))];
		for (const key of keys) {
			if (key[0] !== '_' && iter[key] !== iter2[key]) {
				same = key === 'props' ? isSame(iter[key], iter2[key]) : false;
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

let NAMESPACES;

export const initNs = () => {
	if (!NAMESPACES) {
		NAMESPACES = {
			svg: '2000/svg',
			xlink: '1999/xlink',
			xmlns: '2000/xmlns/',
		};
	}
};

export const getNs = (key) => {
	if (!config._jsx || !config._namespace) return null;
	const ns = NAMESPACES[key];
	if (!ns) return null;
	return ns.indexOf('http') !== 0 ? `http://www.w3.org/${ns}` : ns;
};

export const addNs = (ns, url) => {
	NAMESPACES = NAMESPACES || {};
	NAMESPACES[ns] = url;
};

export const options = {
	vnode: (vnode) => {},
	unmount: (vnode) => {},
};

// Just for smaller bundles. Google Optimize has 20kb limit for JS so every character counts :D
export const domAppend = (parent, child) => {
	parent.append(child);
};

export const getParent = (node) => node?.parentElement;

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

export const isObject = (obj) => obj && typeof obj === 'object';

export const createDocumentFragment = () => document.createDocumentFragment();

/**
 * @param {VNode} vnode
 * @param {boolean} recursive
 * @returns {Element|null}
 */
export const getVNodeDom = (vnode, recursive) =>
	vnode ? vnode.__dom || (recursive ? getVNodeDom(vnode.__result) : vnode.__result?.__dom) : null;

/**
 * Helper function to get first rendered DOM node. Is used by components that has a fragment as root
 * @param {VNode} vnode
 * @returns {Element|null}
 */
export const getVNodeFirstRenderedDom = (vnode) => {
	if (!vnode) return null;
	if (vnode.__dom) return vnode.__dom;
	if (vnode.__result) return getVNodeDom(vnode.__result);
	if (vnode.__children) {
		for (const child of vnode.__children) {
			const dom = getVNodeDom(child);
			if (dom && dom.nodeType < 4) {
				return dom;
			}
		}
	}
	return null;
};

// Internal object for storing details of current output/etc
// This is just a placeholder object, all properties will be replaced to booleans with replace plugin.
/**
 * @prop {boolean} jsx Internal jsx support flag
 * @prop {boolean} classComponent Internal class component support flag
 * @prop {boolean} hooks Internal hooks support flag
 * @prop {boolean} namespace Internal namespace tag/attribute support flag
 * @prop {boolean} className Internal class as className props support flag
 * @prop {boolean} extendedVnode Internal extended VNode type support (DOM element & HTML string)
 */
export const config = {};

/**
 * Internal object for storing details of currently rendered component's hooks.
 * Hook pointer properties:
 * @prop {boolean} __current Currently processed hook index
 * @prop {boolean} __hooks Array pointer to current VNode's hooks
 * @prop {boolean} __vnode Current VNode
 */
export const hookPointer = {
	__current: 0,
	__hooks: [],
	__vnode: null,
};

export const isSame = (iter, iter2) => {
	if (iter === iter2) return true;
	if ((!iter && iter2) || (iter && !iter2)) return false;
	if (isObject(iter) && isObject(iter2)) {
		let same = true;
		const keys = [...new Set(Object.keys(iter), Object.keys(iter2))];
		for (const key of keys) {
			if (key === 'children') continue;
			if (key[0] !== key && iter[key] !== iter2[key]) {
				same = isObject(iter[key]) ? isSame(iter[key], iter2[key]) : false;
				break;
			}
		}
		return same;
	}
	return false;
};

export const onNextTick = (callback) => {
	setTimeout(callback);
};

export const createVNode = (tag = '', props) => {
	return {
		type: tag,
		props,
		key: props.key,
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
	if (!config.jsx || !config.namespace) return null;
	const ns = NAMESPACES[key];
	if (!ns) return null;
	return ns.indexOf('http') !== 0 ? `http://www.w3.org/${ns}` : ns;
};

export const addNs = (ns, url) => {
	NAMESPACES = NAMESPACES || {};
	NAMESPACES[ns] = url;
};

export const options = {
	// eslint-disable-next-line no-unused-vars
	vnode: (vnode) => {},
	// eslint-disable-next-line no-unused-vars
	unmount: (vnode) => {},
};

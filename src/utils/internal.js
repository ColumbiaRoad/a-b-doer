// Just for smaller bundles. Google Optimize has 20kb limit for JS so every character counts :D
export const domAppend = (parent, child) => {
	parent.append(child);
};

export const getParent = (node) => node?.parentNode;

export const domInsertBefore = (child, target) => {
	getParent(target)?.insertBefore(child, target);
};

export const domInsertAfter = (child, target) => {
	const parent = getParent(target);
	if (parent) {
		if (target.nextSibling) parent.insertBefore(child, target.nextSibling);
		else parent.append(child);
	}
};

export const domRemove = (node) => {
	getParent(node)?.removeChild(node);
};

export const domReplaceWith = (oldNode, newNode) => {
	const parent = getParent(oldNode);
	if (!parent) return;
	domInsertBefore(newNode, oldNode);
	domRemove(oldNode);
};

export const isFunction = (fn) => typeof fn === 'function';

export const isString = (str) => typeof str === 'string';

export const isArray = (arr) => Array.isArray(arr);

export const isObject = (obj) => obj && typeof obj === 'object';

export const createDocumentFragment = () => document.createDocumentFragment();

export const isDomFragment = (node) => node && node.nodeType === 11;

/**
 * @param {VNode} vnode
 * @param {boolean} recursive
 * @returns {Element|null}
 */
export const getVNodeDom = (vnode, recursive) =>
	vnode ? vnode.__dom || (recursive ? getVNodeDom(vnode.__result, recursive) : vnode.__result?.__dom) : null;

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
 * @prop {boolean} __vnode Current VNode
 */
export const hookPointer = {
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
			if (iter[key] !== iter2[key]) {
				same = isObject(iter[key]) ? isSame(iter[key], iter2[key]) : false;
				break;
			}
		}
		return same;
	}
	return false;
};

export const createVNode = (tag = '', props) => {
	return {
		type: tag,
		props,
		key: props.key,
		__children: undefined,
		__dom: undefined,
		__parent: undefined,
		__prevSibling: undefined,
		__result: undefined,
	};
};

const abdNsKey = '_abNS';

export const initNs = () => {
	window[abdNsKey] = window[abdNsKey] || {};
	Object.assign(window[abdNsKey], {
		svg: '2000/svg',
		xlink: '1999/xlink',
		xmlns: '2000/xmlns/',
	});
};

export const getNs = (key) => {
	if (!config.jsx || !config.namespace) return null;
	const ns = window[abdNsKey]?.[key];
	if (!ns) return null;
	return ns.indexOf('http') !== 0 ? `http://www.w3.org/${ns}` : ns;
};

export const addNs = (ns, url) => {
	window[abdNsKey][ns] = url;
};

export const options = {
	// eslint-disable-next-line no-unused-vars
	vnode: (vnode) => {},
	// eslint-disable-next-line no-unused-vars
	unmount: (vnode) => {},
};

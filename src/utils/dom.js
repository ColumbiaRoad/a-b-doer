import { patchVnodeDom, isVNode, runUnmountCallbacks, getTestID, renderVnode } from './render';
import {
	config,
	createDocumentFragment,
	domAppend,
	domInsertBefore,
	domRemove,
	getVNodeDom,
	isArray,
	isDomFragment,
} from './internal';

export const createSelector = (node, selector) => [node, selector];

// Alias for createSelector
export const cs = createSelector;

const getSelectorParent = (selector) => (isArray(selector) ? selector[0] : document);
const getSelectorQuery = (selector) => (isArray(selector) ? selector[1] : selector);

let defaultTimeout = 5000;
let defaultPollDelay = 100;

/**
 * Tries x many times if the given selector comes matches to element on DOM. There's a 100ms delay between each attempt.
 *
 * @param {String|Array} selector Element selector string or array
 * @param {(targetNode: HTMLElement) => void} callback
 * @param {Number} [wait] how many milliseconds to poll, default 1000
 */
export const pollQuerySelector = (selector, callback, wait = defaultTimeout) => {
	let el = getSelectorParent(selector).querySelector(getSelectorQuery(selector));
	if (el) {
		callback(el);
	} else if (wait > 0) {
		setTimeout(() => {
			pollQuerySelector(selector, callback, wait - defaultPollDelay);
		}, defaultPollDelay);
	}
};

/**
 * Tries x many times if the given selector comes matches to element on DOM. There's a 100ms delay between each attempt.
 * This returns all elements that matches the selector.
 *
 * @param {String|Array} selector Element selector string or array
 * @param {(targetNodes: NodeListOf<HTMLElement>) => void} callback
 * @param {Number} [wait] how many milliseconds to poll, default 1000
 */
export const pollQuerySelectorAll = (selector, callback, wait = defaultTimeout) => {
	let el = getSelectorParent(selector).querySelectorAll(getSelectorQuery(selector));
	if (el.length) {
		callback(Array.from(el));
	} else if (wait > 0) {
		setTimeout(() => {
			pollQuerySelectorAll(selector, callback, wait - defaultPollDelay);
		}, defaultPollDelay);
	}
};

/**
 * Waits x milliseconds for given selector to be visible in the DOM. Checks every 100ms.
 *
 * @param {String|Array} selector Element selector string or array
 * @param {Number} [wait] default 5 seconds
 * @returns {Promise<HTMLElement | undefined>}
 */
export const waitElement = (selector, wait = defaultTimeout) => {
	return new Promise((resolve) => {
		const t = setTimeout(resolve, wait + 10);
		pollQuerySelector(
			selector,
			(element) => {
				clearTimeout(t);
				resolve(element);
			},
			wait
		);
	});
};

/**
 * Waits x milliseconds for given selector to be visible in the DOM. Checks every 100ms.
 *
 * @param {String|Array} selector Element selector string or array
 * @param {Number} [wait] default 5 seconds
 * @returns {Promise<NodeListOf<HTMLElement> | []>}
 */
export const waitElements = (selector, wait = defaultTimeout) => {
	return new Promise((resolve) => {
		const t = setTimeout(() => resolve([]), wait + 10);
		pollQuerySelectorAll(
			selector,
			(elements) => {
				clearTimeout(t);
				resolve(elements);
			},
			wait
		);
	});
};

/**
 * @typedef {any} WaitedValue
 */
/**
 * Waits x milliseconds for given function to return true.
 *
 * @param {() => WaitedValue} func
 * @param {Number} [wait]
 * @returns {Promise<WaitedValue | undefined>}
 */
export const waitFor = (func, wait = defaultTimeout) => {
	return new Promise((resolve) => {
		const t = setTimeout(resolve, wait + 10);

		const _func = (count) => {
			const res = func();
			if (res !== undefined) {
				clearTimeout(t);
				resolve(res);
			} else if (count > 0) {
				setTimeout(() => {
					_func(count - 1);
				}, defaultPollDelay);
			}
		};

		_func(wait / defaultPollDelay);
	});
};

const getChildrenArray = (child) => {
	if (isArray(child)) return child;
	if (!child) return [];
	// If document fragment, use its contents otherwise return the child in an array
	return isDomFragment(child) ? Array.from(child.children) : [child];
};

/**
 * @param {HTMLElement|DocumentFragment|VNode} child
 * @param {HTMLElement} parent
 */
const clearPrevious = (child, parent) => {
	const children = getChildrenArray(child);
	children.forEach((child) => {
		let id;
		if (isVNode(child)) {
			id = child.key;
		} else {
			id = child.dataset?.o;
		}
		if (id) {
			Array.from(parent.children).forEach((child) => {
				if (child.dataset?.o === id) {
					domRemove(child);
				}
			});
		}
	});
};

const createMutation = (child) => {
	// Skip VNode check when we're adding elements in preact env, otherwise ab doer will be in the bundle with preact
	// If there's no jsx at all, do not add MutationObserver.
	let node = child;
	if (!process.env.preact && config.jsx && isVNode(child)) {
		node = patchVnodeDom(renderVnode(child), null, true) || createDocumentFragment();
	}

	getChildrenArray(node).forEach((c) => {
		if (c.dataset && !c.dataset.o) {
			c.dataset.o = node.key || getTestID();
		}
	});

	return node;
};

/**
 * @param {HTMLElement|VNode} vnode
 * @param {HTMLElement} parent
 * @param {boolean} [clearPrev]
 * @returns {HTMLElement|VNode} Rendered element
 */
export const append = (vnode, parent, clearPrev = true) => {
	vnode.__parent = parent;
	const child = createMutation(vnode);
	if (clearPrev) {
		clearPrevious(child, parent);
	}
	domAppend(parent, child);
	return vnode;
};

/**
 * @param {HTMLElement|VNode} vnode
 * @param {HTMLElement} parent
 * @param {boolean} [clearPrev]
 * @returns {HTMLElement|VNode} Rendered element
 */
export const prepend = (vnode, parent, clearPrev = true) => {
	vnode.__parent = parent;
	const child = createMutation(vnode);
	if (clearPrev) {
		clearPrevious(child, parent);
	}
	if (parent.firstElementChild) {
		domInsertBefore(child, parent.firstElementChild);
	} else {
		domAppend(parent, child);
	}
	return vnode;
};

/**
 * @param {HTMLElement|VNode} vnode
 * @param {HTMLElement} before
 * @param {boolean} [clearPrev]
 * @returns {HTMLElement|VNode} Rendered element
 */
export const insertBefore = (vnode, before, clearPrev = true) => {
	vnode.__parent = before.parentNode;
	const child = createMutation(vnode);
	if (clearPrev) {
		clearPrevious(child, before.parentNode);
	}
	domInsertBefore(child, before);
	return vnode;
};

/**
 * @param {HTMLElement|VNode} vnode
 * @param {HTMLElement} after
 * @param {boolean} [clearPrev]
 * @returns {HTMLElement|VNode} Rendered element
 */
export const insertAfter = (vnode, after, clearPrev = true) => {
	const parentNode = after.parentNode;
	vnode.__parent = parentNode;
	const child = createMutation(vnode);
	if (clearPrev) {
		clearPrevious(child, parentNode);
	}
	if (after.nextElementSibling) {
		domInsertBefore(child, after.nextElementSibling);
	} else {
		domAppend(parentNode, child);
	}
	return vnode;
};

export const clear = (target, id) => {
	if (!target) {
		target = document;
	}
	domRemove(target.querySelector(`[data-o="${id}"]`));
};

export const clearAll = (id = getTestID()) => {
	document.querySelectorAll(`[data-o="${id}"]`).forEach((node) => {
		domRemove(node);
	});
};

export const unmount = (vnode) => {
	runUnmountCallbacks(vnode);
	domRemove(getVNodeDom(vnode, true));
};

export const setDefaultTimeout = (timeout) => {
	defaultTimeout = timeout;
};

export const setDefaultPollDelay = (delay) => {
	defaultPollDelay = delay;
};

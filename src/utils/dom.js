import { Promise } from '../polyfills';
import { patchVnodeDom, isVNode, runUnmountCallbacks, getTestID, renderVnode, getVNodeDom } from './render';
import { config, createDocumentFragment, domAppend, domInsertBefore, domRemove, isArray } from './internal';

/**
 * Tries x many times if the given selector comes matches to element on DOM. There's a 100ms delay between each attempt.
 *
 * @param {String} selector Element selector string
 * @param {(targetNode: HTMLElement) => void} callback
 * @param {Number} [wait] how many milliseconds to poll, default 1000
 */
export const pollQuerySelector = (selector, callback, wait = 1000) => {
	var el = document.querySelector(selector);
	if (el) {
		callback(el);
	} else if (wait > 0) {
		setTimeout(function () {
			pollQuerySelector(selector, callback, wait - 100);
		}, 100);
	}
};

/**
 * Tries x many times if the given selector comes matches to element on DOM. There's a 100ms delay between each attempt.
 * This returns all elements that matches the selector.
 *
 * @param {String} selector Element selector string
 * @param {(targetNodes: HTMLElement[]) => void} callback
 * @param {Number} [wait] how many milliseconds to poll, default 1000
 */
export const pollQuerySelectorAll = (selector, callback, wait = 1000) => {
	var el = document.querySelectorAll(selector);
	if (el.length) {
		callback(Array.from(el));
	} else if (wait > 0) {
		setTimeout(function () {
			pollQuerySelectorAll(selector, callback, wait - 100);
		}, 100);
	}
};

/**
 * Waits x milliseconds for given selector to be visible in the DOM. Checks every 100ms.
 *
 * @param {String} selector Element selector string
 * @param {Number} [wait] default 5 seconds
 * @returns {Promise<HTMLElement>}
 */
export const waitElement = (selector, wait = 5000) => {
	return new Promise((resolve, reject) => {
		const t = setTimeout(reject, wait + 10);
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
 * @param {String} selector Element selector string
 * @param {Number} [wait] default 5 seconds
 * @returns {Promise<HTMLElement[]>}
 */
export const waitElements = (selector, wait = 5000) => {
	return new Promise((resolve, reject) => {
		const t = setTimeout(reject, wait + 10);
		pollQuerySelectorAll(
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
 * @typedef {any} WaitedValue
 */
/**
 * Waits x milliseconds for given function to return true.
 *
 * @param {() => WaitedValue} func
 * @param {Number} [wait]
 * @returns {Promise<WaitedValue>}
 */
export const waitFor = (func, wait = 5000) => {
	return new Promise((resolve, reject) => {
		const t = setTimeout(reject, wait + 10);

		const _func = (count) => {
			const res = func();
			if (res) {
				clearTimeout(t);
				resolve(res);
			} else if (count > 0) {
				setTimeout(function () {
					_func(count - 1);
				}, 100);
			}
		};

		_func(wait / 100);
	});
};

const getChildrenArray = (child) => {
	if (isArray(child)) return child;
	if (!child) return [];
	// If document fragment, use its contents otherwise return the child in an array
	return child.nodeType === 11 ? Array.from(child.children) : [child];
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
	if (!process.env.preact && config.j && isVNode(child)) {
		node = patchVnodeDom(renderVnode(child)) || createDocumentFragment();
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
	const child = createMutation(vnode);
	const parentNode = after.parentNode;
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

export const clearAll = () => {
	document.querySelectorAll(`[data-o="${getTestID()}"]`).forEach((node) => {
		domRemove(node);
	});
};

export const unmount = (vnode) => {
	runUnmountCallbacks(vnode);
	domRemove(getVNodeDom(vnode, true));
};

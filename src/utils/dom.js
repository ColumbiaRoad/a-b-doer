import { render, isVNode, getTestID } from './render';
import { Promise } from '../polyfills';
import { domAppend, domInsertBefore, domRemove } from './internal';
import { runUnmountCallbacks } from './render';

/**
 * Tries x many times if the given selector comes matches to element on DOM. There's a 100ms delay between each attempt.
 *
 * @param {String} selector Element selector string
 * @param {(targetNode: HTMLElement) => void} callback
 * @param {Number} [wait] how many milliseconds to poll, default 1000
 */
export function pollQuerySelector(selector, callback, wait = 1000) {
	var el = document.querySelector(selector);
	if (el) {
		callback(el);
	} else if (wait > 0) {
		setTimeout(function () {
			pollQuerySelector(selector, callback, wait - 100);
		}, 100);
	}
}

/**
 * Tries x many times if the given selector comes matches to element on DOM. There's a 100ms delay between each attempt.
 * This returns all elements that matches the selector.
 *
 * @param {String} selector Element selector string
 * @param {(targetNodes: HTMLElement[]) => void} callback
 * @param {Number} [wait] how many milliseconds to poll, default 1000
 */
export function pollQuerySelectorAll(selector, callback, wait = 1000) {
	var el = document.querySelectorAll(selector);
	if (el.length) {
		callback(Array.from(el));
	} else if (wait > 0) {
		setTimeout(function () {
			pollQuerySelectorAll(selector, callback, wait - 100);
		}, 100);
	}
}

/**
 * Waits x milliseconds for given selector to be visible in the DOM. Checks every 100ms.
 *
 * @param {String} selector Element selector string
 * @param {Number} [wait] default 5 seconds
 * @returns {Promise<HTMLElement>}
 */
export function waitElement(selector, wait = 5000) {
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
}

/**
 * Waits x milliseconds for given selector to be visible in the DOM. Checks every 100ms.
 *
 * @param {String} selector Element selector string
 * @param {Number} [wait] default 5 seconds
 * @returns {Promise<HTMLElement[]>}
 */
export function waitElements(selector, wait = 5000) {
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
}

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
export function waitFor(func, wait = 5000) {
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
}

function getChildrenArray(child) {
	if (Array.isArray(child)) return child;
	if (!child) return [];
	let children = [child];
	// If document fragment, use its contents
	if (child.nodeType === 11) {
		children = Array.from(child.children);
	}
	return children;
}

/**
 * @param {HTMLElement|DocumentFragment|VNode} child
 * @param {HTMLElement} parent
 */
function clearPrevious(child, parent) {
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
				if (child.dataset.o === id) {
					domRemove(parent, child);
				}
			});
		}
	});
}

function createMutation(child) {
	// Skip mutation check when we're adding elements in preact env, otherwise ab doer render() will be in the bundle with preact
	if (process.env.preact) {
		return child;
	}
	let node = child;
	if (isVNode(child)) {
		const rendered = render(child);
		const children = getChildrenArray(rendered);
		node = document.createDocumentFragment();
		children.forEach((child) => {
			domAppend(node, child);
		});
		if (children[0]?.parentElement) {
			setTimeout(() => {
				// Add checker for root node's dom removal.
				new MutationObserver((mutations, observer) => {
					mutations.forEach((mutation) => {
						mutation.removedNodes.forEach((el) => {
							if (children.includes(el)) {
								observer.disconnect();
								runUnmountCallbacks(child);
							}
						});
					});
				}).observe(children[0].parentElement, {
					childList: true,
				});
			});
		}
	}
	return node;
}

/**
 * @param {HTMLElement|VNode|VNode[]} vnode
 * @param {HTMLElement} parent
 * @param {boolean} [clearPrev]
 * @returns {VNode} Rendered VNode
 */
export function append(vnode, parent, clearPrev = true) {
	const child = createMutation(vnode);
	if (clearPrev) {
		clearPrevious(child, parent);
	}
	domAppend(parent, child);
	return vnode;
}

/**
 * @param {HTMLElement|HTMLElement[]|VNode|VNode[]} vnode
 * @param {HTMLElement} parent
 * @param {boolean} [clearPrev]
 * @returns {VNode} Rendered VNode
 */
export function prepend(vnode, parent, clearPrev = true) {
	const child = createMutation(vnode);
	if (clearPrev) {
		clearPrevious(child, parent);
	}
	if (parent.firstElementChild) {
		domInsertBefore(parent, child, parent.firstElementChild);
	} else {
		domAppend(parent, child);
	}
	return vnode;
}

/**
 * @param {HTMLElement|HTMLElement[]|VNode|VNode[]} vnode
 * @param {HTMLElement} before
 * @param {boolean} [clearPrev]
 * @returns {VNode} Rendered VNode
 */
export function insertBefore(vnode, before, clearPrev = true) {
	const child = createMutation(vnode);
	if (clearPrev) {
		clearPrevious(child, before.parentNode);
	}
	domInsertBefore(before.parentNode, child, before);
	return vnode;
}

/**
 * @param {HTMLElement|HTMLElement[]|VNode|VNode[]} vnode
 * @param {HTMLElement} after
 * @param {boolean} [clearPrev]
 * @returns {VNode} Rendered VNode
 */
export function insertAfter(vnode, after, clearPrev = true) {
	const child = createMutation(vnode);
	const parentNode = after.parentNode;
	if (clearPrev) {
		clearPrevious(child, parentNode);
	}
	if (after.nextElementSibling) {
		domInsertBefore(parentNode, child, after.nextElementSibling);
	} else {
		domAppend(parentNode, child);
	}
	return vnode;
}

export function clear(target, id) {
	if (!target) {
		target = document;
	}
	prevNode = target.querySelector(`[data-o="${id}"]`);
	if (prevNode) {
		domRemove(prevNode.parentNode, prevNode);
	}
}

export function clearAll() {
	document.querySelectorAll(`[data-o="${getTestID()}"]`).forEach((node) => {
		if (node.parentElement) {
			domRemove(node.parentElement, prevnodeNode);
		}
	});
}

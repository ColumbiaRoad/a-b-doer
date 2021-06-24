import { Promise } from '../polyfills';

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

function setElementTestID(element, index) {
	const id = element.dataset.o || `${getTestID()}${index ? index + 1 : ''}`;
	element.dataset.o = id;
}

/**
 * @param {HTMLElement|DocumentFragment} child
 * @param {HTMLElement} parent
 */
function clearPrevious(child, parent) {
	let children = [child];
	// If document fragment, use its contents
	if (child.nodeType === 11) {
		children = Array.from(child.children);
	}
	children.forEach((child, index) => {
		const id = child.dataset.o;
		if (id) {
			Array.from(parent.children).forEach((child) => {
				if (child.dataset.o === id) {
					parent.removeChild(child);
				}
			});
		}
	});
}

function createMutation(children) {
	if (Array.isArray(children)) {
		const frag = document.createDocumentFragment();
		children.forEach((child, index) => {
			frag.appendChild(child);
			setElementTestID(child, index);
		});
		return frag;
	} else {
		setElementTestID(children);
		return children;
	}
}

/**
 * @param {HTMLElement|HTMLElement[]} child
 * @param {HTMLElement} parent
 * @param {boolean} [clearPrev]
 * @returns {HTMLElement} child
 */
export function append(child, parent, clearPrev = true) {
	child = createMutation(child);
	if (clearPrev) {
		clearPrevious(child, parent);
	}
	parent.appendChild(child);
	return child;
}

/**
 * @param {HTMLElement|HTMLElement[]} child
 * @param {HTMLElement} parent
 * @param {boolean} [clearPrev]
 * @returns {HTMLElement} child
 */
export function prepend(child, parent, clearPrev = true) {
	child = createMutation(child);
	if (clearPrev) {
		clearPrevious(child, parent);
	}
	if (parent.firstElementChild) {
		parent.insertBefore(child, parent.firstElementChild);
	} else {
		parent.appendChild(child);
	}
	return child;
}

/**
 * @param {HTMLElement|HTMLElement[]} child
 * @param {HTMLElement} before
 * @param {boolean} [clearPrev]
 * @returns {HTMLElement} child
 */
export function insertBefore(child, before, clearPrev = true) {
	child = createMutation(child);
	if (clearPrev) {
		clearPrevious(child, before.parentNode);
	}
	before.parentNode.insertBefore(child, before);
	return child;
}

/**
 * @param {HTMLElement|HTMLElement[]} child
 * @param {HTMLElement} after
 * @param {boolean} [clearPrev]
 * @returns {HTMLElement} child
 */
export function insertAfter(child, after, clearPrev = true) {
	child = createMutation(child);
	const parentNode = after.parentNode;
	if (clearPrev) {
		clearPrevious(child, parentNode);
	}
	if (after.nextElementSibling) {
		parentNode.insertBefore(child, after.nextElementSibling);
	} else {
		parentNode.appendChild(child);
	}
	return child;
}

export function clear(target, id) {
	if (!target) {
		target = document;
	}
	prevNode = target.querySelector(`[data-o="${id}"]`);
	if (prevNode) {
		prevNode.parentNode.removeChild(prevNode);
	}
}

export function getTestID() {
	return process.env.TEST_ID;
}

export function clearAll() {
	document.querySelectorAll(`[data-o="${getTestID()}"]`).forEach((node) => {
		if (node.parentElement) {
			node.parentElement.removeChild(node);
		}
	});
}

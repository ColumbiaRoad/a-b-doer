/**
 * Tries x many times if the given selector comes matches to element on DOM. There's a 100ms delay between each attempt.
 *
 * @param {String} selector Element selector string
 * @param {(targetNode: HTMLElement) => void} callback
 * @param {Number} [count] default 5
 */
export function pollQuerySelector(selector, callback, count = 5) {
	var el = document.querySelector(selector);
	if (el) {
		callback(el);
	} else if (count > 0) {
		setTimeout(function () {
			pollQuerySelector(selector, callback, count - 1);
		}, 100);
	}
}

/**
 * Tries x many times if the given selector comes matches to element on DOM. There's a 100ms delay between each attempt.
 * This returns all elements that matches the selector.
 *
 * @param {String} selector Element selector string
 * @param {(targetNodes: HTMLElement[]) => void} callback
 * @param {Number} [count] default 5
 */
export function pollQuerySelectorAll(selector, callback, count = 5) {
	var el = document.querySelectorAll(selector);
	if (el) {
		callback(Array.from(el));
	} else if (count > 0) {
		setTimeout(function () {
			pollQuerySelectorAll(selector, callback, count - 1);
		}, 100);
	}
}

/**
 * @param {HTMLElement} parent
 * @param {HTMLElement} child
 */
function clearPrevious(parent, child) {
	const id = child.getAttribute('data-o');
	if (id) clear(parent, id);
}

/**
 * @param {HTMLElement} parent
 * @param {HTMLElement} child
 */
export function append(parent, child) {
	clearPrevious(parent, child);
	parent.appendChild(child);
}

/**
 * @param {HTMLElement} parent
 * @param {HTMLElement} child
 */
export function prepend(parent, child) {
	clearPrevious(parent, child);
	if (parent.firstElementChild) {
		parent.insertBefore(child, parent.firstElementChild);
	} else {
		parent.appendChild(child);
	}
}

/**
 * @param {HTMLElement} parent
 * @param {HTMLElement} child
 * @param {HTMLElement} before
 */
export function insertBefore(parent, child, before) {
	clearPrevious(parent, child);
	parent.insertBefore(child, before);
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

function hashf(s) {
	let hash = 0;
	let strlen = s.length;

	if (strlen === 0) {
		return hash;
	}
	for (let i = 0; i < strlen; i++) {
		let c = s.charCodeAt(i);
		hash = (hash << 5) - hash + c;
		hash = hash & hash; // Convert to 32bit integer
	}
	return hash;
}

export function getTestID() {
	let id = process.env.TEST_ID;
	return id ? 't' + hashf(id).toString(36) : 't-default';
}

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

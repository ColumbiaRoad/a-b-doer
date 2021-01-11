/**
 * Returns a function, that, when invoked, will only be triggered at most once
 * during a given window of time.
 *
 * @param {Function} func
 * @param {Number} timeFrame
 */
export function throttle(func, timeFrame) {
	let lastTime = 0;
	return function () {
		const now = Date.now();
		if (now - lastTime >= timeFrame) {
			func();
			lastTime = now;
		}
	};
}

/**
 * Returns a function, that, as long as it continues to be invoked, will not
 * be triggered. The function will be called after it stops being called for
 * N milliseconds. If `immediate` is passed, trigger the function on the
 * leading edge, instead of the trailing.
 *
 * @param {Function} func
 * @param {Number} wait
 * @param {Boolean} [immediate]
 */
export function debounce(func, wait, immediate) {
	let timeout;
	return function () {
		const context = this;
		const args = arguments;
		const later = function () {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		const callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
}

/**
 * @typedef {Object} Ref
 * @property {*|null} current
 */

/**
 * Initializes the reference object.
 * @param {*} current Initial value
 * @returns {Ref}
 */
export const useRef = (current = null) => {
	return { current };
};

/**
 * Runs given function in the next tick.
 * @param {Function} cb
 */
export const useHook = (cb) => {
	setTimeout(cb, 0);
};

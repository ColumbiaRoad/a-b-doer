/**
 * @typedef {Object} Ref
 * @property {*|null} current
 */

/**
 * Initializes the reference object.
 * @returns {Ref}
 */
export const useRef = () => {
	return { current: null };
};

/**
 * Runs given function in the next tick.
 * @param {Function} cb
 */
export const useHook = (cb) => {
	setTimeout(cb, 0);
};

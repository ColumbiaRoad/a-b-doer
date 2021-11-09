export interface Ref<T> {
	current: null | T;
}

/**
 * Initializes the reference object.
 * @param current Initial value
 */
export function useRef<T = any>(current?: T = null): Ref<T>;

/**
 * Runs given function in the next tick.
 * @param {Function} cb
 */
export function useHook(cb: Function): void;

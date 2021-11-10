export interface Ref<T> {
	current: null | T;
}

/**
 * Initializes the reference object.
 * @param current Initial value, defaults null
 */
export function useRef<T = any>(current?: T): Ref<T>;

/**
 * Runs given function in the next tick.
 * @param cb Function to be executed
 */
export function useHook(cb: Function): void;

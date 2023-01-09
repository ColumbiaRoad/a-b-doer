export interface Ref<T> {
	current: null | T;
}

/**
 * Initializes the reference object.
 * @param current Initial value, defaults null
 */
export function useRef<T = any>(current?: T): Ref<T>;

/**
 * Effect hook that'll be called after component has been rendered.
 * @param cb Function to be executed
 * @param cache Values that works as a cache key
 */
export function useEffect(cb: Function, cache?: Array<any>): void;

/**
 * Returns a tuple that contains a stateful value and a function to update it.
 * @param defaultValue
 */
export function useState<T = any>(defaultValue?: T): [T, (value: T) => void];

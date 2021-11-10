/**
 * Returns a function, that, when invoked, will only be triggered at most once
 * during a given window of time.
 * @param fn Function to be executed
 * @param timeFrame Time frame in milliseconds
 */
export function throttle(fn: Function, timeFrame: number): void;

/**
 * Returns a function, that, as long as it continues to be invoked, will not
 * be triggered. The function will be called after it stops being called for
 * N milliseconds. If `immediate` is passed, trigger the function on the
 * leading edge, instead of the trailing.
 * @param func Function to be executed
 * @param wait Debounce timeout in milliseconds
 * @param immediate Immediate call, default false
 */
export function debounce(func: Function, wait: number, immediate?: boolean): void;

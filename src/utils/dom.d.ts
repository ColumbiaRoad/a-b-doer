/**
 * Tries x many times if the given selector comes matches to element on DOM. There's a 100ms delay between each attempt.
 * @param selector Element selector string
 * @param {(targetNode: HTMLElement) => void} callback
 * @param [wait] how many milliseconds to poll, default 1000
 */
export function pollQuerySelector(
	selector: string,
	callback: (targetNode: HTMLElement) => void,
	wait: number = 1000
): void;

/**
 * Tries x many times if the given selector comes matches to element on DOM. There's a 100ms delay between each attempt.
 * This returns all elements that matches the selector.
 * @param selector Element selector string
 * @param callback
 * @param wait how many milliseconds to poll, default 1000
 */
export function pollQuerySelectorAll(
	selector: string,
	callback: (targetNodes: HTMLElement[]) => void,
	wait?: number = 1000
): void;

/**
 * Waits x milliseconds for given selector to be visible in the DOM. Checks every 100ms.
 * @param selector Element selector string
 * @param wait default 5 seconds
 */
export function waitElement(selector: string, wait?: number = 5000): Promise<HTMLElement>;

/**
 * Waits x milliseconds for given selector to be visible in the DOM. Checks every 100ms.
 * @param selector Element selector string
 * @param wait default 5 seconds
 */
export function waitElements(selector: string, wait?: number = 5000): Promise<HTMLElement[]>;

/**
 * Waits x milliseconds for given function to return true.
 * @param func Evaluation function
 * @param wait default 5 seconds
 */
export function waitFor<T = any>(func: () => T, wait?: number = 5000): Promise<T>;

/**
 * Adds element(s) to beginning of the given parent element child list
 *
 * @param child
 * @param parent
 * @param clearPrev
 * @returns child
 */
export function append(child: HTMLElement | HTMLElement[], parent: HTMLElement, clearPrev: boolean = true): HTMLElement;

/**
 * Adds element(s) to end of the given parent element child list
 *
 * @param child
 * @paramparent
 * @param clearPrev
 * @returns child
 */
export function prepend(
	child: HTMLElement | HTMLElement[],
	parent: HTMLElement,
	clearPrev: boolean = true
): HTMLElement;

/**
 * Inserts element(s) before given element.
 *
 * @param child
 * @param before
 * @param clearPrev
 * @returns child
 */
export function insertBefore(
	child: HTMLElement | HTMLElement[],
	before: HTMLElement,
	clearPrev: boolean = true
): HTMLElement;

/**
 * Inserts element(s) after given element.
 *
 * @param child
 * @param after
 * @param clearPrev
 * @returns child
 */
export function insertAfter(
	child: HTMLElement | HTMLElement[],
	after: HTMLElement,
	clearPrev: boolean = true
): HTMLElement;

/**
 * Removes elements that matches given id from given root element.
 *
 * @param root Root element for search, fallbacks to document.
 * @param id
 */
export function clear(root: HTMLElement | Document | null, id: string): void;

/**
 * Returns current test ID which is generated from the test file by the bundler.
 *
 * @returns testID
 */
export function getTestID(): string;

/**
 * Removes all DOM nodes that shares the current test ID (@see getTestID)
 */
export function clearAll(): void;

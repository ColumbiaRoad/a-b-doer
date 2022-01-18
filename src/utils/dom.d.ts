import { VNode } from '../render.js';

/**
 * Tries x many times if the given selector comes matches to element on DOM. There's a 100ms delay between each attempt.
 * @param selector Element selector string
 * @param callback
 * @param wait how many milliseconds to poll, default 1000 ms
 */
export function pollQuerySelector<T = HTMLElement>(
	selector: string,
	callback: (targetNode: T) => void,
	wait?: number
): void;

/**
 * Tries x many times if the given selector comes matches to element on DOM. There's a 100ms delay between each attempt.
 * This returns all elements that matches the selector.
 * @param selector Element selector string
 * @param callback
 * @param wait how many milliseconds to poll, default 1000 ms
 */
export function pollQuerySelectorAll<T = HTMLElement>(
	selector: string,
	callback: (targetNodes: T[]) => void,
	wait?: number
): void;

/**
 * Waits x milliseconds for given selector to be visible in the DOM. Checks every 100ms.
 * @param selector Element selector string
 * @param wait default 5000 ms
 */
export function waitElement<T>(selector: string, wait?: number): Promise<T>;

/**
 * Waits x milliseconds for given selector to be visible in the DOM. Checks every 100ms.
 * @param selector Element selector string
 * @param wait default 5000 ms
 */
export function waitElements<T>(selector: string, wait?: number): Promise<T[]>;

/**
 * Waits x milliseconds for given function to return true.
 * @param func Evaluation function
 * @param wait default 5000 ms
 */
export function waitFor<T = any>(func: () => T, wait?: number): Promise<T>;

/**
 * Adds element(s) to beginning of the given parent element child list
 * @param child Created element
 * @param parent Targeted parent element
 * @param clearPrev Clear all matching same elements, default true
 * @returns Rendered element
 */
export function append(child: HTMLElement | VNode, parent: HTMLElement, clearPrev?: boolean): HTMLElement;

/**
 * Adds element(s) to end of the given parent element child list
 * @param child Created element
 * @param parent Targeted parent element
 * @param clearPrev Clear all matching same elements, default true
 * @returns Rendered element
 */
export function prepend(child: HTMLElement | VNode, parent: HTMLElement, clearPrev?: boolean): HTMLElement;

/**
 * Inserts element(s) before given element.
 * @param child Created element
 * @param before Targeted element
 * @param clearPrev Clear all matching same elements, default true
 * @returns Rendered element
 */
export function insertBefore(child: HTMLElement | VNode, before: HTMLElement, clearPrev?: boolean): HTMLElement;

/**
 * Inserts element(s) after given element.
 * @param child Created element
 * @param after Targeted element
 * @param clearPrev Clear all matching same elements, default true
 * @returns Rendered element
 */
export function insertAfter(child: HTMLElement | VNode, after: HTMLElement, clearPrev?: boolean): HTMLElement;

/**
 * Removes elements that matches given id from given root element.
 * @param root Root element for search, fallbacks to document.
 * @param id
 */
export function clear(root: HTMLElement | Document | null, id: string): void;

/**
 * Removes all DOM nodes that shares the current test ID (@see getTestID)
 */
export function clearAll(): void;

/**
 * Runs VNode unmount callbacks and removes the element from dom
 * @param vnode
 */
export function unmount(vnode: VNode): void;

import { VNode } from '../render.js';

type AnyElementTagNameMap = HTMLElementTagNameMap & SVGElementTagNameMap;

type Selector<E extends Element, S extends string> = [E, S];

type ReturnElementType<T> = T extends keyof AnyElementTagNameMap ? AnyElementTagNameMap[T] : HTMLElement;

export function createSelector<E extends Element = HTMLElement, K extends keyof AnyElementTagNameMap>(
	element: E,
	selector: K
): Selector<E, K>;
export function createSelector<E extends Element = HTMLElement>(element: E, selector: string): Selector<E, string>;

/**
 * Tries x many times if the given selector comes matches to element on DOM. There's a 100ms delay between each attempt.
 * @param selector Element selector string
 * @param callback
 * @param wait how many milliseconds to poll, default 1000 ms
 */
export function pollQuerySelector<E extends Element, S extends Selector<E, string>>(
	selector: S,
	callback: (targetNode: ReturnElementType<S[1]>) => void,
	wait?: number
): void;
export function pollQuerySelector<K extends keyof AnyElementTagNameMap>(
	selector: K,
	callback: (targetNode: AnyElementTagNameMap[K]) => void,
	wait?: number
): void;
export function pollQuerySelector<E extends Element = HTMLElement>(
	selector: string,
	callback: (targetNode: E) => void,
	wait?: number
): void;

/**
 * Tries x many times if the given selector comes matches to element on DOM. There's a 100ms delay between each attempt.
 * This returns all elements that matches the selector.
 * @param selector Element selector string
 * @param callback
 * @param wait how many milliseconds to poll, default 1000 ms
 */
export function pollQuerySelectorAll<E extends Element, S extends Selector<K, string>>(
	selector: S,
	callback: (targetNodes: ReturnElementType<S[1]>) => void,
	wait?: number
): void;
export function pollQuerySelectorAll<K extends keyof AnyElementTagNameMap>(
	selector: K,
	callback: (targetNodes: NodeListOf<AnyElementTagNameMap[K]>) => void,
	wait?: number
): void;
export function pollQuerySelectorAll<E extends Element = HTMLElement>(
	selector: string,
	callback: (targetNodes: NodeListOf<E>) => void,
	wait?: number
): void;

/**
 * Waits x milliseconds for given selector to be visible in the DOM. Checks every 100ms.
 * @param selector Element selector string
 * @param wait default 5000 ms
 */
export function waitElement<E extends Element, S extends Selector<K, string>>(
	selector: S,
	wait?: number
): Promise<ReturnElementType<S[1]>>;
export function waitElement<K extends keyof AnyElementTagNameMap>(
	selector: K,
	wait?: number
): Promise<AnyElementTagNameMap[K]>;
export function waitElement<E extends Element = HTMLElement>(selector: string, wait?: number): Promise<E>;

/**
 * Waits x milliseconds for given selector to be visible in the DOM. Checks every 100ms.
 * @param selector Element selector string
 * @param wait default 5000 ms
 */
export function waitElements<E extends Element, S extends Selector<K, string>>(
	selector: S,
	wait?: number
): Promise<NodeListOf<ReturnElementType<S[1]>>>;
export function waitElements<K extends keyof AnyElementTagNameMap>(
	selector: string,
	wait?: number
): Promise<NodeListOf<AnyElementTagNameMap[K]>>;
export function waitElements<E extends Element = HTMLElement>(selector: string, wait?: number): Promise<NodeListOf<E>>;

/**
 * Waits x milliseconds for given function to return true.
 * @param func Evaluation function
 * @param wait default 5000 ms
 */
export function waitFor<T = any>(func: () => T, wait?: number): Promise<T>;

type ChildNode = HTMLElement | VNode;

/**
 * Adds element(s) to beginning of the given parent element child list
 * @param child Created element
 * @param parent Targeted parent element
 * @param clearPrev Clear all matching same elements, default true
 * @returns Rendered element
 */
export function append<T extends ChildNode>(
	child: T,
	parent: HTMLElement,
	clearPrev?: boolean
): T extends HTMLElement ? HTMLElement : VNode;

/**
 * Adds element(s) to end of the given parent element child list
 * @param child Created element
 * @param parent Targeted parent element
 * @param clearPrev Clear all matching same elements, default true
 * @returns Rendered element
 */
export function prepend<T extends ChildNode>(
	child: T,
	parent: HTMLElement,
	clearPrev?: boolean
): T extends HTMLElement ? HTMLElement : VNode;

/**
 * Inserts element(s) before given element.
 * @param child Created element
 * @param before Targeted element
 * @param clearPrev Clear all matching same elements, default true
 * @returns Rendered element
 */
export function insertBefore<T extends ChildNode>(
	child: T,
	before: HTMLElement,
	clearPrev?: boolean
): T extends HTMLElement ? HTMLElement : VNode;

/**
 * Inserts element(s) after given element.
 * @param child Created element
 * @param after Targeted element
 * @param clearPrev Clear all matching same elements, default true
 * @returns Rendered element
 */
export function insertAfter<T extends ChildNode>(
	child: T,
	after: HTMLElement,
	clearPrev?: boolean
): T extends HTMLElement ? HTMLElement : VNode;

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

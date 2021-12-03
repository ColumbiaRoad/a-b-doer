/**
 * Renders and re-renders given AB Doer VNode. If target node is given, it will be replaced with the rendered vnode.
 * @param {VNode|HTMLElement|string|number} vnode
 * @param {HTMLElement} [targetNode]
 * @returns {HTMLElement}
 */
export function render(vnode: VNode | HTMLElement | string | number | Component, targetNode?: HTMLElement): HTMLElement;

export type VNode<P = {}> = {
	type: string | any;
	props: P;
	key: string;
	[x: string]: any;
};

export class Component<P = {}, S = {}> extends preact.Component<P, S> {}

type AnyObject = { [x: string]: any };

/**
 * Returns current test ID which is generated from the test file by the bundler.
 * @returns testID
 */
export function getTestID(): string;

export const Fragment: Component<{}, {}>;

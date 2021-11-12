export type VNode<P = {}> = {
	type: string | any;
	props: P;
	key: string;
	[x: string]: any;
};

export class Component<P = {}> extends preact.Component<P> {}

type AnyObject = { [x: string]: any };

/**
 * Renders and re-renders given AB Doer VNode with optional new props.
 * @param {VNode|HTMLElement|string|number} vnode
 * @param {AnyObject} [newProps]
 * @returns {HTMLElement}
 */
export function render(vnode: VNode | HTMLElement | string | number | Component, newProps: AnyObject): HTMLElement;

/**
 * Returns current test ID which is generated from the test file by the bundler.
 * @returns testID
 */
export function getTestID(): string;

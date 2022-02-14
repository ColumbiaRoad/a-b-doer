/**
 * Renders given AB Doer VNode. If target node is given, it will be replaced with the rendered vnode.
 * @param {VNode} vnode
 * @param {HTMLElement} [targetNode]
 * @returns {VNode}
 */
export function render(vnode: VNode, targetNode?: HTMLElement): VNode;

export type VNode<P = {}> = {
	type: string | any;
	props: P;
	key: string;
	[x: string]: any;
};

export class Component<P = {}, S = {}> extends preact.Component<P, S> {}

export type FC<P = {}> = preact.FunctionComponent<P>;

type AnyObject = { [x: string]: any };

/**
 * Returns current test ID which is generated from the test file by the bundler.
 * @returns testID
 */
export function getTestID(): string;

export const Fragment: Component<{}, {}>;

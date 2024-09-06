import { append } from './utils/dom';
import { patchVnodeDom, renderVnode, Fragment as _Fragment, getTestID as _getTestID } from './utils/render';
import { getVNodeDom, onNextTick } from './utils/internal';

/**
 * Super simple class abstract for class like components.
 */
export class Component {
	state = {};
	constructor(props) {
		this.props = props;
	}
	setState(newState) {
		const vnode = this.__vnode;
		const old = { ...vnode };
		this.__state = { ...this.state };
		onNextTick(() => {
			Object.assign(this.state, newState);
			this.__vnode = renderVnode(vnode, old);
			patchVnodeDom(vnode, old);
		});
	}
}

/**
 * Renders given AB Doer VNode. If target node is given, rendered node will be added to it.
 * @param {VNode} vnode
 * @param {HTMLElement} [targetNode]
 * @returns {VNode}
 */
export const render = (vnode, targetNode) => getVNodeDom(targetNode ? append(vnode, targetNode) : renderVnode(vnode));

export const Fragment = _Fragment;

export const getTestID = _getTestID;

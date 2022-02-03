import { append } from './utils/dom';
import {
	patchVnodeDom,
	renderVnode,
	Fragment as _Fragment,
	getTestID as _getTestID,
	getVNodeDom,
} from './utils/render';

/**
 * Super simple class abstract for class like components.
 */
export class Component {
	_v;
	state = {};
	constructor(props) {
		this.props = props;
	}
	setState(newState) {
		Object.assign(this.state, newState);
		const old = { ...this._v };
		this._v = renderVnode(this._v, old);
		patchVnodeDom(this._v, old);
	}
}

/**
 * Renders given AB Doer VNode. If target node is given, rendered node will be added to it.
 * @param {VNode} vnode
 * @param {HTMLElement} [targetNode]
 * @returns {HTMLElement}
 */
export const render = (vnode, targetNode) => getVNodeDom(targetNode ? append(vnode, targetNode) : renderVnode(vnode));

export const Fragment = _Fragment;

export const getTestID = _getTestID;

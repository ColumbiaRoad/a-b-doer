import { append } from './utils/dom';
import { _render, Fragment as _Fragment, getTestID as _getTestID } from './utils/render';

/**
 * Super simple class abstract for class like components.
 */
export class Component {
	_v;
	_r;
	state = {};
	constructor(props) {
		this.props = props;
	}
	setState(newState) {
		Object.assign(this.state, newState);
		_render(this._v, this._r);
	}
}

/**
 * Renders and re-renders given AB Doer VNode. If target node is given, rendered node will be added to it.
 * @param {VNode} vnode
 * @param {HTMLElement} [targetNode]
 * @returns {VNode}
 */
export function render(vnode, targetNode) {
	return targetNode ? append(vnode, targetNode) : _render(vnode);
}

export const Fragment = _Fragment;

export const getTestID = _getTestID;

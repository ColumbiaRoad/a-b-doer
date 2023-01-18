import './polyfills.js';
import { config, createVNode, initNs, options } from './utils/internal';
import { Fragment } from './utils/render';

/**
 * Simple parser utility for jsx syntax. Converts JSX syntax to simple objects that can be rendered to DOM nodes with render utility (@see render() [./utils/render.js])
 * Should be used with babel and plugin-transform-react-jsx.
 */

if (config.namespace) {
	initNs();
}

/**
 * Creates a html element with given attributes and child nodes.
 * @param {String} tag
 * @param {Object} props
 * @param  {...any} children
 * @returns {HTMLElement}
 */
const createElement = (tag, props, ...children) => {
	props = props || {};

	if (config.className) {
		if (props.class) {
			props.className = props.class;
		} else if (props.className) {
			props.class = props.className;
		}
	}

	if (children) props.children = children;

	const vnode = createVNode(tag, props);

	if (tag === 'svg') {
		vnode.svg = true;
	}

	if (import.meta.hot) {
		options.vnode(vnode);
	}

	return vnode;
};

export const h = createElement;

export const hf = Fragment;

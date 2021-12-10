import './polyfills.js';
import { config, createVNode } from './utils/internal';
import { Fragment } from './utils/render';

/**
 * Simple parser utility for jsx syntax. Converts JSX syntax to simple objects that can be rendered to DOM nodes with render utility (@see render() [./utils/render.js])
 * Should be used with babel and plugin-transform-react-jsx.
 */

/**
 * Creates a html element with given attributes and child nodes.
 * @param {String} tag
 * @param {Object} props
 * @param  {...any} children
 * @returns {HTMLElement}
 */
function createElement(tag, props, ...children) {
	props = props || {};

	if (props.class) {
		props.className = props.class;
	} else if (props.className) {
		props.class = props.className;
	}

	props.children = children || [];

	const vnode = createVNode(tag, props);

	if (tag === 'svg') {
		vnode.svg = true;
	}

	config.jsx = true; // Helps terser to detect if jsx support should be bundled

	return vnode;
}

export const h = createElement;

export const hf = Fragment;

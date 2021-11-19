import './polyfills.js';
import { getTestID, Fragment } from './utils/render';

/**
 * Simple parser utility for jsx syntax. Converts JSX syntax to simple objects that can be rendered to DOM nodes with render utility (@see render() [./utils/render.js])
 * Should be used with babel and plugin-transform-react-jsx.
 *
 * If a state or hooks or any other react related thing is required, I would recommend using the preact library which is
 * a little bit larger (but still very small) lib but handles nicely all more advanced stuff (test config option preact: true).
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

	if (props.className) {
		props.class = props.className;
	} else if (props.class) {
		props.className = props.class;
	}

	props.children = children || [];

	const vnode = {
		type: tag,
		props,
		key: props.key || props['data-o'] || getTestID(),
	};

	if (tag === 'svg') {
		vnode.svg = true;
	}

	return vnode;
}

export const h = createElement;

export const hf = Fragment;

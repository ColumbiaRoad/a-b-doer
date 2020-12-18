import './polyfills.js';

/**
 * Simple parser utility for jsx syntax.
 *
 * Should be used with babel and plugin-transform-react-jsx. This lib does not handle any state related stuff or
 * handle re-render of the component. It just implements functions that babel parser calls for every jsx element and
 * returns HTMLElement nodes which can be inserted into the DOM as is.
 *
 * If a state or hooks or any other react related thing is required, I would recommend using the preact library which is
 * a little bit larger (but still very small) lib but handles nicely all more advanced stuff (test config option preact: true).
 */

// List of most common svg only tags
const nsElements = /^(animate(Motion|Transform)?|circle|clipPath|defs|desc|discard|ellipse|fe[A-Z]|filter|foreignObject|g|image|line(arGradient)?|marker|mask|metadata|m?path|pattern|poly(gon|line)|radialGradient|rect|set|stop|style|svg|switch|symbol|text(Path)?|title|tspan|unknown|use|view)$/;

/**
 * @param {String} tag
 * @returns {Boolean}
 */
const isNs = (tag) => {
	return nsElements.test(tag);
};

/**
 * Creates a style string from given object. If argument is already a string, then return it.
 * @param {Object|String} style
 * @returns {String}
 */
const getStyleString = (style) => {
	if (typeof style === 'string') return style;
	if (!style || typeof style !== 'object') return '';

	return Object.keys(style).reduce((prev, curr) => {
		return `${(prev += curr
			.split(/(?=[A-Z])/)
			.join('-')
			.toLowerCase())}:${style[curr]};`;
	}, '');
};

const renderer = document.createElement('div');

/**
 * Creates a html element with given attributes and child nodes.
 * @param {String} tag
 * @param {Object} props
 * @param  {...any} children
 * @returns {HTMLElement}
 */
function createElement(tag, props, ...children) {
	props = props || {};

	Object.defineProperty(props, 'children', {
		enumerable: false,
		value: children,
	});

	if (typeof tag === 'function') return tag(props, ...children);

	/** @type {HTMLElement}*/
	let element;

	if (tag instanceof HTMLElement || tag instanceof SVGElement) {
		element = tag;
	}

	if (!element) {
		if (typeof tag !== 'string') return;

		// Mainly for imported svg strings. Svg element as string is much smaller than transpiled jsx result.
		// At least in Google Optimize there's quite small size limit for assets.
		if (tag.indexOf('<') !== -1) {
			renderer.innerHTML = tag;
			element = renderer.firstElementChild.cloneNode(true);
			renderer.innerHTML = '';
		} else {
			element = isNs(tag) ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag);
		}
	}

	for (let name in props) {
		if (props.hasOwnProperty(name)) {
			let value = props[name];
			if (name === 'className') {
				name = 'class';
			} else if (name === 'style') {
				value = getStyleString(value);
			} else if (name === 'html') {
				element.innerHTML = value;
				continue;
			} else if (name === 'ref' && value) {
				if (typeof value === 'function') {
					value(element);
				} else if (value.current !== undefined) {
					value.current = element;
				}
				continue;
			}
			if (value === false || value === undefined) continue;
			if (name.indexOf('on') === 0 && name.toLowerCase() in window)
				element.addEventListener(name.toLowerCase().substr(2), value);
			else element.setAttribute(name, value.toString());
		}
	}

	children.forEach((child) => {
		if (child !== undefined && child !== null && child !== false) {
			appendChild(element, child);
		}
	});

	return element;
}

/**
 * @param {HTMLElement} parent
 * @param {HTMLElement|HTMLElement[]} child
 */
function appendChild(parent, child) {
	if (Array.isArray(child)) {
		child.forEach((nestedChild) => appendChild(parent, nestedChild));
	} else if (child !== undefined && child !== null && child !== false) {
		parent.appendChild(child.nodeType ? child : document.createTextNode(child));
	}
}

function createFragment(props, ...children) {
	return children;
}

export const h = createElement;

export const hf = createFragment;

/**
 * @typedef {Object} Ref
 * @property {*|null} current
 */

/**
 * Initializes the reference object.
 * @returns {Ref}
 */
export const ref = () => {
	return { current: null };
};

/**
 * Runs given function in the next tick.
 * @param {Function} cb
 */
export const hook = (cb) => {
	setTimeout(cb, 0);
};

import { domAppend, hooks } from './internal';

function copyInternal(source, target) {
	['_h', '_i', '_n', '_r', '_v'].forEach((a) => {
		if (source[a] !== undefined) target[a] = source[a];
	});
}

/**
 * Renders and re-renders given AB Doer VNode with optional new props.
 * @param {VNode|HTMLElement|string|number|Component} vnode
 * @param {Object} [newProps]
 * @returns {HTMLElement}
 */
export function render(vnode, newProps) {
	if (isDomNode(vnode) || typeof vnode === 'string' || typeof vnode === 'number' || vnode === undefined) {
		return vnode;
	}

	/** @type {HTMLElement} */
	let element;
	let merged = false;

	// If we're rendering a component that has a reference to VNode, use it instead.
	if (vnode._v) {
		vnode = vnode._v;
	}

	if (Array.isArray(vnode)) {
		const a = render({
			type: Fragment,
			props: { children: vnode },
			key: '',
		});
		return a;
	}

	const { type: tag, props, svg } = vnode;
	const children = props.children;
	const frag = isFragment(tag);
	const newestProps = newProps || props;

	// Handle custom components
	if (typeof tag === 'function' && !frag) {
		functionType = tag;

		if (newProps && !newProps.children) {
			newProps.children = children;
		}

		let ref = vnode;

		// Class syntax components
		if (tag.prototype?.render) {
			let comp = vnode._i;
			// First render
			if (!comp) {
				vnode._i = comp = new tag(props);
				comp._v = vnode; // So render call inside of Component setState knows which VNode to render
				const newVNode = comp.render();
				vnode._r = newVNode;
				element = render(newVNode);
				if (comp.componentDidMount) {
					comp.componentDidMount();
				}
			}
			// Subsequent render
			else {
				const oldProps = vnode.props;
				if (newProps) {
					vnode._i.props = vnode.props = newProps;
				}
				newProps = vnode.props;
				const newVNode = comp.render();
				if (!newVNode) return newVNode;
				newVNode.key = vnode.key;
				newVNode.props.children = mergeChildren(vnode._r, newVNode);
				vnode._r = newVNode;
				element = render(newVNode);
				mergeElementInto(element, vnode._n, props, newProps);
				merged = true;
				element = vnode._n;
				if (comp.componentDidUpdate) {
					comp.componentDidUpdate(oldProps);
				}
			}
		}
		// Functional components
		else {
			vnode._h = vnode._h || [];
			hooks.h = vnode._h;
			hooks.c = 0;
			hooks.v = vnode;
			const newVNode = tag(newProps || props);
			if (!newVNode) return newVNode;
			newVNode.key = vnode.key;
			if (vnode._r) {
				newVNode.props.children = mergeChildren(vnode._r, newVNode);
			}
			vnode._r = newVNode;
			element = render(newVNode);
		}

		// If one of props is a ref, put the component instance or re-render function to the ref value.
		if (props.ref) {
			if (typeof props.ref === 'function') {
				props.ref(ref);
			} else if (props.ref.current !== undefined) {
				props.ref.current = ref;
			}
		}
	}
	// HTML/text etc elements
	else {
		// Build element if it's not a fragment
		if (!frag) {
			if (isDomNode(vnode)) {
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
					element = svg ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag);
				}
			}

			setElementAttributes(element, props);

			if (vnode.key && isDomNode(element) && !newestProps['data-o']) element.dataset.o = vnode.key;
		}

		if (frag) {
			element = document.createDocumentFragment();
		}

		children.map((child, index) => {
			if (isRenderableElement(child)) {
				if (vnode.svg) {
					child.svg = true;
				}
				if (isVNode(child)) {
					child.key = vnode.key + index;
				}
				return appendChild(element, child);
			}
		});
	}

	if (vnode._n && !merged) {
		mergeElementInto(element, vnode._n, props, newestProps);
		element = vnode._n;
	} else {
		vnode._n = element;
	}

	return element;
}

/**
 * Copy all internal values from source children to new children and run unmount callbacks from removed children.
 * @param {Object} source
 * @param {Object} target
 * @returns {Array<Object>}
 */
function mergeChildren(source, target) {
	return target.props.children.map((child, index) => {
		const oldChild = source.props.children[index];
		if (!child && typeof oldChild?.type === 'function') {
			runUnmountCallbacks(oldChild);
		}
		if (!child || !oldChild) return child;
		if (typeof child.type === 'function' && oldChild.type === child.type) {
			copyInternal(oldChild, child);
		}
		return child;
	});
}

/**
 * Renders given child VNode and appends it to the parent DOM node.
 * @param {HTMLElement} parent
 * @param {VNode|VNode[]} child
 */
function appendChild(parent, child) {
	if (isRenderableElement(child)) {
		const node = render(child);
		if (node === null) return;
		// Only root elements should have data-o attribute
		if (node?.dataset) delete node.dataset.o;
		domAppend(parent, node.nodeType ? node : document.createTextNode(node));
		return node;
	}
}

/**
 * Merges element DOM node to another. Removes events that are not present.
 * @param {HTMLElement} source
 * @param {HTMLElement} target
 */
function mergeElementInto(source, target, oldProps, newProps) {
	const sourceAttrs = [...source.attributes];

	Object.entries(oldProps).forEach(([key, value]) => {
		if (!newProps[key]) target.removeAttribute(key);
		if (/^on[A-Z]/.test(key)) {
			target.removeEventListener(key.substr(2).toLowerCase(), value);
		}
	});

	sourceAttrs.forEach((attr) => target.setAttribute(attr.nodeName, attr.nodeValue));

	target.innerHTML = '';
	[...source.childNodes].forEach((child) => {
		domAppend(target, child);
	});

	return target;
}

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

function setElementAttributes(element, props) {
	for (let name in props) {
		if (props.hasOwnProperty(name)) {
			let value = props[name];
			if (name === 'className' || name === 'children') {
				continue;
			} else if (name === 'style') {
				value = getStyleString(value);
			} else if (name === 'html') {
				element.innerHTML = value;
				continue;
			} else if (name === 'dangerouslySetInnerHTML') {
				element.innerHTML = value.__html;
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
			if (/^on[A-Z]/.test(name)) {
				element.addEventListener(name.substr(2).toLowerCase(), value);
			} else element.setAttribute(name, value.toString());
		}
	}
}

function isRenderableElement(element) {
	return !!element || element === 0;
}

export function runUnmountCallbacks(vnode) {
	if (isVNode(vnode)) {
		if (vnode._h) {
			vnode._h.forEach((h) => {
				if (h.length === 3 && typeof h[2] === 'function') {
					h[2]();
				}
			});
			vnode._h = [];
		} else if (vnode._i && vnode._i.componentWillUnmount) {
			vnode._i.componentWillUnmount();
			delete vnode._i;
		}
		(vnode._r || vnode).props.children.forEach((vnode) => {
			if (typeof vnode.type === 'function') runUnmountCallbacks(vnode);
		});
		delete vnode._n;
	}
}

/**
 * Super simple class abstract for class like components.
 */
export class Component {
	state = {};
	constructor(props) {
		this.props = props;
		if (!this.props.children) {
			this.props.children = [];
		}
	}
	setState(newState) {
		Object.assign(this.state, newState);
		render(this);
	}
}

export function Fragment(props) {
	return props.children;
}

export function getTestID() {
	return process.env.TEST_ID;
}

function isFragment(tag) {
	return tag === Fragment;
}

export function isDomNode(tag) {
	return tag instanceof HTMLElement || tag instanceof SVGElement;
}

export function isVNode(vnode) {
	return !!vnode._n || !!vnode.props;
}

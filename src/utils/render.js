import { domAppend, hooks, onNextTick, isFunction, isString, createDocumentFragment, config } from './internal';

function copyInternal(source, target) {
	['_h', '_i', '_n', '_r'].forEach((a) => {
		if (source[a] !== undefined) target[a] = source[a];
	});
}

let NAMESPACES;

function initNs() {
	if (NAMESPACES) return;
	NAMESPACES = window.__namespaces || {
		svg: '2000/svg',
		space: 'XML/1998/namespace',
		xlink: '1999/xlink',
		xmlns: '2000/xmlns/',
	};
	window.__namespaces = NAMESPACES;
}

function getNs(key) {
	if (!config.jsx) return null;
	const ns = NAMESPACES[key];
	if (!ns) return null;
	if (ns.indexOf('http') !== 0) {
		return `http://www.w3.org/${ns}`;
	}
	return ns;
}

/**
 * Renders given AB Doer VNode.
 * @param {VNode|HTMLElement|string|number|Component} vnode
 * @param {VNode|HTMLElement|string|number|Component} [oldVnode]
 * @returns {HTMLElement}
 */
export function _render(vnode, oldVnode) {
	if (!config.jsx || isDomNode(vnode) || isString(vnode) || typeof vnode === 'number' || vnode === undefined) {
		return vnode;
	}

	initNs();

	/** @type {HTMLElement} */
	let element;
	const oldProps = oldVnode?.props;
	if (oldVnode) {
		copyInternal(oldVnode, vnode);
		// Component instance holds a reference to VNode tree, update it
		if (vnode._i) {
			vnode._i._v = vnode;
			vnode._i._r = oldVnode;
		}
	}

	if (Array.isArray(vnode)) {
		const a = _render({
			type: Fragment,
			props: { children: vnode },
			key: '',
		});
		return a;
	}

	const { type: tag, props, svg } = vnode;
	const children = props.children;
	const frag = isFragment(tag);

	// Handle custom components
	if (isFunction(tag) && !frag) {
		functionType = tag;

		let ref = vnode;

		// Class syntax components
		if (tag.prototype?.render) {
			let comp = vnode._i;
			// First render
			if (!comp) {
				vnode._i = comp = new tag(props);
				comp._v = vnode; // So render call inside of Component setState knows which VNode to render
				const newVNode = comp.render();
				newVNode.key = vnode.key;
				comp._r = vnode._r = newVNode;
				element = _render(newVNode);
				if (comp.componentDidMount) {
					onNextTick(() => comp.componentDidMount());
				}
			}
			// Subsequent render
			else {
				const prevState = Object.assign({}, comp.state);
				const newVNode = comp.render();
				if (!newVNode) return newVNode;
				newVNode.key = vnode.key;
				element = _render(newVNode, vnode._r);
				comp._r = vnode._r = newVNode;
				element = vnode._n;
				if (comp.componentDidUpdate) {
					onNextTick(() => comp.componentDidUpdate(oldProps, prevState));
				}
			}
		}
		// Functional components
		else {
			vnode._h = vnode._h || [];
			hooks.h = vnode._h;
			hooks.c = 0;
			hooks.v = vnode;
			const newVNode = tag(props);
			if (!newVNode) return newVNode;
			newVNode.key = vnode.key;
			element = _render(newVNode, vnode._r);
			vnode._r = newVNode;
		}

		// If one of props is a ref, put the component instance or re-render function to the ref value.
		if (props.ref) {
			if (isFunction(props.ref)) {
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

			if (!element && oldVnode?._n && oldVnode.type === tag) {
				element = oldVnode._n;
			}

			if (!element) {
				if (!isString(tag)) return;

				// Mainly for imported svg strings. Svg element as string is much smaller than transpiled jsx result.
				// At least in Google Optimize there's quite small size limit for assets.
				if (tag.indexOf('<') !== -1) {
					renderer.innerHTML = tag;
					element = renderer.firstElementChild.cloneNode(true);
					renderer.innerHTML = '';
				} else {
					element = svg ? document.createElementNS(getNs('svg'), tag) : document.createElement(tag);
				}
			}

			setElementAttributes(element, props, oldProps);
		}

		if (frag) {
			element = createDocumentFragment();
		}

		setChildren(vnode, element, children, oldProps?.children);
	}

	vnode._n = oldVnode?._n || element;

	return element;
}

/**
 * @param {VNode} vnode
 * @param {HTMLElement} element
 * @param {Array} children
 * @param {Array} [oldChildren]
 */
function setChildren(vnode, element, children, oldChildren) {
	element.innerHTML = '';

	// Set of old children that could have unmount callbacks (same string/number values can be grouped to one)
	const oldChildrenSet = new Set(oldChildren);

	children.map((child, index) => {
		let oldChild = oldChildren?.[index];
		if (isRenderableElement(child)) {
			if (vnode.svg) {
				child.svg = true;
			}
			if (isVNode(child)) {
				child.key = vnode.key + (!isFragment(vnode) ? index : '');
				// Only root elements should have data-o attribute
				child.props['data-o'] = null;

				if (oldChildren) {
					const oldWithKey = child.key === oldChild?.key ? oldChild : oldChildren.find((c) => c.key === child.key);
					if (oldWithKey) {
						if (oldWithKey.type === child.type) {
							oldChildrenSet.delete(oldWithKey);
							oldChild = oldWithKey;
						} else {
							oldChild = undefined;
						}
					}
				}
			}
			return appendRenderedChild(element, child, oldChild);
		}
	});

	for (const oldChild of oldChildrenSet) {
		if (isVNode(oldChild)) runUnmountCallbacks(oldChild);
	}
}

/**
 * Renders given child VNode and appends it to the parent DOM node.
 * @param {HTMLElement} parent
 * @param {VNode|VNode[]} child
 * @param {VNode|VNode[]} [oldVnode]
 */
function appendRenderedChild(parent, child, oldVnode) {
	let node = _render(child, oldVnode);
	if (!isRenderableElement(node)) return;
	// if (node?.dataset) delete node.dataset.o;
	domAppend(parent, node.nodeType ? node : document.createTextNode(node));
}

/**
 * Creates a style string from given object. If argument is already a string, then return it.
 * @param {Object|String} style
 * @returns {String}
 */
const getStyleString = (style) => {
	if (isString(style)) return style;
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
 *
 * @param {HTMLElement} element
 * @param {Object} props
 * @param {Object} [oldProps]
 */
function setElementAttributes(element, props = {}, oldProps = {}) {
	for (let name in oldProps) {
		let value = oldProps[name];
		if (!props[name]) element.removeAttribute(name);
		if (/^on[A-Z]/.test(name)) {
			element.removeEventListener(name.substr(2).toLowerCase(), value);
		}
	}
	for (let name in props) {
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
			if (isFunction(value)) {
				value(element);
			} else if (value.current !== undefined) {
				value.current = element;
			}
			continue;
		}
		if (value === false || value === undefined) continue;
		if (/^on[A-Z]/.test(name)) {
			element.addEventListener(name.substr(2).toLowerCase(), value);
		} else if (value !== null) {
			value = value.toString();
			if (name.includes(':') && element.tagName.toLowerCase() != 'svg') {
				const [ns, nsName] = name.split(':');
				element.setAttributeNS(getNs(nsName) || getNs(ns), name, value);
			} else {
				element.setAttribute(name, value);
			}
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
				if (h.length === 3 && isFunction(h[2])) {
					h[2]();
				}
			});
			vnode._h = [];
		} else if (vnode._i && vnode._i.componentWillUnmount) {
			vnode._i.componentWillUnmount();
			delete vnode._i;
		}
		(vnode._r || vnode).props.children.forEach((vnode) => {
			if (isFunction(vnode.type)) runUnmountCallbacks(vnode);
		});
		delete vnode._n;
	}
}

export function Fragment(props) {
	return props.children;
}

export function getTestID() {
	return process.env.TEST_ID;
}

function isFragment(tag) {
	if (isVNode(tag)) tag = tag.type;
	return tag === Fragment;
}

export function isDomNode(tag) {
	return tag instanceof HTMLElement || tag instanceof SVGElement;
}

export function isVNode(vnode) {
	return !!vnode && (!!vnode._n || !!vnode.props);
}

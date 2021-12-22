import {
	domAppend,
	hooks,
	onNextTick,
	isFunction,
	isString,
	createDocumentFragment,
	config,
	createVNode,
	domRemove,
	domInsertBefore,
} from './internal';

/**
 * @typedef VNode
 * @prop {String} key Identifier for the VNode
 * @prop {Array} children
 * @prop {String|Function} type VNode type
 * @prop {Object} props Element/Component props
 * @prop {Array} [_h] Hooks of custom component
 * @prop {*} [_i] Class component instance
 * @prop {HTMLElement} [_n] Rendered DOM node
 * @prop {VNode} [_r] Rendered VNode of custom component
 */

export const Fragment = (props) => props.children;

export const getTestID = () => process.env.TEST_ID;

export const isDomNode = (tag) => tag instanceof HTMLElement || tag instanceof SVGElement;

/**
 * @param {VNode} vnode
 * @returns {boolean}
 */
export const isVNode = (vnode) => !!vnode && (!!vnode._n || !!vnode.props);

/**
 * @param {VNode} vnode
 * @returns {HTMLElement}
 */
const getVNodeDom = (vnode) => (vnode ? vnode._n || vnode._r?._n : null);

const isRenderableElement = (element) => !!element || element === 0;

/**
 * @param {VNode} vnode
 * @param {VNode} vnode2
 * @returns {boolean}
 */
const isSameChild = (vnode, vnode2) =>
	vnode && vnode2 && (vnode === vnode2 || (vnode.key === vnode2.key && vnode.type === vnode2.type));

function isFragment(tag) {
	if (isVNode(tag)) tag = tag.type;
	return tag === Fragment;
}

/**
 * @param {VNode} source
 * @param {VNode2} source
 */
function copyInternal(source, target) {
	['_h', '_i', '_n', '_p', '_r'].forEach((a) => {
		if (source[a] !== undefined) target[a] = source[a];
	});
}

let NAMESPACES;

function initNs() {
	if (!NAMESPACES) {
		NAMESPACES = window.__namespaces || {
			svg: '2000/svg',
			space: 'XML/1998/namespace',
			xlink: '1999/xlink',
			xmlns: '2000/xmlns/',
		};
		window.__namespaces = NAMESPACES;
	}
}

function getNs(key) {
	if (!config.jsx) return null;
	const ns = NAMESPACES[key];
	if (!ns) return null;
	return ns.indexOf('http') !== 0 ? `http://www.w3.org/${ns}` : ns;
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

	const { type: tag, props = {}, svg } = vnode;
	const children = props.children;
	const frag = isFragment(tag);

	// Handle custom components
	if (isFunction(tag) && !frag) {
		let ref = vnode;
		const prevVNode = vnode._r;
		let newVNode;

		// Class syntax components
		if (tag.prototype?.render) {
			let comp = vnode._i;
			const cb = [];
			// First render
			if (!comp) {
				vnode._i = comp = new tag(props);
				comp._v = vnode; // So render call inside of Component setState knows which VNode to render
				if (comp.componentDidMount) {
					cb.push(() => comp.componentDidMount());
				}
			}
			// Subsequent render
			else {
				const prevState = Object.assign({}, comp.state);
				vnode._i.props = props;
				if (comp.componentDidUpdate) {
					cb.push(() => comp.componentDidUpdate(oldProps, prevState));
				}
			}
			newVNode = comp.render();
			if (!isVNode(newVNode)) {
				delete vnode._n;
				delete vnode._r;
				return newVNode;
			}
			newVNode.key = vnode.key;
			comp._r = vnode._r = newVNode;
			element = _render(newVNode, prevVNode);
			cb.forEach((c) => onNextTick(c()));
		}
		// Functional components
		else {
			vnode._h = vnode._h || [];
			hooks.h = vnode._h;
			hooks.c = 0;
			hooks.v = vnode;
			newVNode = tag(props);
			if (!isVNode(newVNode)) {
				delete vnode._n;
				return newVNode;
			}
			newVNode.key = vnode.key;
			vnode._r = newVNode;
			element = _render(newVNode, prevVNode);
		}
		vnode._p = { ...vnode };

		// If render tree root type changes, replace the element from DOM
		if (vnode._n && prevVNode && newVNode.type !== prevVNode.type) {
			const parent = vnode._n.parentNode;
			domInsertBefore(parent, element, vnode._n);
			runUnmountCallbacks(prevVNode);
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
			if (isDomNode(tag)) {
				element = tag;
			}

			const nNode = getVNodeDom(oldVnode);
			if (!element && nNode && isSameChild(oldVnode, vnode)) {
				element = nNode;
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
					if (!tag) {
						element = document.createTextNode(props.text);
					} else {
						element = svg ? document.createElementNS(getNs('svg'), tag) : document.createElement(tag);
					}
				}
			}

			setElementAttributes(element, props, oldProps);
		} else {
			element = createDocumentFragment();
		}

		vnode.props.children = createChildren(vnode, element, children, oldProps?.children);
	}

	vnode._n = element;

	return vnode._n;
}

function flatten(items) {
	const flat = [];

	items.forEach((item) => {
		if (Array.isArray(item)) {
			flat.push(...flatten(item));
		} else {
			flat.push(item);
		}
	});

	return flat;
}
/**
 * @param {VNode} vnode
 * @param {HTMLElement} element
 * @param {Array} children
 * @param {Array} [oldChildren]
 */
function createChildren(vnode, element, children = [], oldChildren) {
	const oldChildrenMap = new Map();
	const oldChildrenArr = oldChildren || [];
	for (const child of oldChildrenArr) {
		if (child?.key) oldChildrenMap.set(child.key, child);
	}
	const newChildren = flatten(children).map((child, index) => {
		let oldChild;
		let node = child;
		if (isRenderableElement(child)) {
			if (!isVNode(child)) {
				child = createVNode('', { text: child });
			}
			if (vnode.svg) {
				child.svg = true;
			}
			if (!child.props.key) {
				child.key = vnode.key + (!isFragment(vnode) ? index : '');
			}
			// Only root elements should have data-o attribute
			child.props['data-o'] = null;

			oldChild = oldChildrenMap.get(child.key);
			if (!isSameChild(child, oldChild)) {
				oldChild = undefined;
			}
			node = _render(child, oldChild);
			if (getVNodeDom(child) && isVNode(oldChild)) {
				oldChildrenMap.delete(oldChild.key);
			}
		}
		if (isRenderableElement(node)) {
			const prevNode = element.childNodes[index];
			if (prevNode !== node) {
				const nextNode = prevNode?.nextSibling;
				if (!index || nextNode === undefined) {
					domAppend(element, node);
				} else {
					domInsertBefore(element, node, nextNode);
				}
			}
			return child;
		}
	});

	// Loop all the rest old children and run unmount callbacks and finally remove them from the DOM
	for (const [_, oldChild] of oldChildrenMap) {
		runUnmountCallbacks(oldChild);
	}

	return newChildren;
}

/**
 * Creates a style string from given object. If argument is already a string, then return it.
 * @param {Object|String} style
 * @returns {String}
 */
const getStyleString = (style) => {
	if (isString(style)) return style;
	if (!style || typeof style !== 'object') return '';

	return Object.keys(style).reduce(
		(prev, curr) =>
			`${(prev += curr
				.split(/(?=[A-Z])/)
				.join('-')
				.toLowerCase())}:${style[curr]};`,
		''
	);
};

const renderer = document.createElement('div');

/**
 *
 * @param {HTMLElement} element
 * @param {Object} props
 * @param {Object} [oldProps]
 */
function setElementAttributes(element, props = {}, oldProps = {}) {
	if (element instanceof Text) {
		element.textContent = props.text;
	} else if (isDomNode(element)) {
		const sameProps = {};
		for (let name in oldProps) {
			let value = oldProps[name];
			if (value === props[name]) {
				sameProps[name] = true;
				continue;
			}
			if (/^on[A-Z]/.test(name)) {
				element.removeEventListener(name.substr(2).toLowerCase(), value);
			} else element.removeAttribute(name);
		}
		for (let name in props) {
			if (sameProps[name]) {
				continue;
			}
			let value = props[name];
			if (/^className|children|key$/.test(name)) {
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
}

/**
 * @param {VNode} vnode
 */
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
		const node = getVNodeDom(vnode);
		(vnode._r || vnode).props.children.forEach((child) => {
			if (isVNode(child) && isFunction(child.type)) runUnmountCallbacks(child);
		});
		if (node?.parentNode) domRemove(node.parentNode, node);
		delete vnode._n;
	}
}

import {
	hooks,
	onNextTick,
	isFunction,
	isString,
	config,
	createVNode,
	domRemove,
	domReplaceWith,
	isArray,
	domAppend,
	createDocumentFragment,
	isSame,
	domInsertBefore,
	options,
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
 * @prop {VNode[]} [_c] Children where all renderable elements has been converted to VNodes
 * @prop {boolean} [_drt] VNode marked as dirty and the DOM should be updated
 */

export const Fragment = (props) => props.children;

export const getTestID = () => process.env.TEST_ID;

export const isDomNode = (tag) => tag instanceof Element;

/**
 * @param {VNode} vnode
 * @returns {boolean}
 */
export const isVNode = (vnode) => !!vnode && (!!vnode._n || !!vnode.props);

/**
 * @param {VNode} vnode
 * @param {boolean} recursive
 * @returns {Element|null}
 */
export const getVNodeDom = (vnode, recursive) =>
	vnode ? vnode._n || (recursive ? getVNodeDom(vnode._r) : vnode._r?._n) : null;

const isRenderableElement = (element) => !!element || element === 0;

/**
 * @param {VNode} vnode
 * @param {VNode} vnode2
 * @returns {boolean}
 */
const isSameChild = (vnode, vnode2) =>
	vnode &&
	vnode2 &&
	(vnode === vnode2 ||
		(vnode.key === vnode2.key &&
			(vnode.type === vnode2.type || (vnode.type.name && vnode.type.name === vnode2.type.name))));

const isFragment = (tag) => {
	if (isVNode(tag)) tag = tag.type;
	return tag === Fragment;
};

/**
 * @param {VNode} source
 * @param {VNode2} source
 */
const copyInternal = (source, target) => {
	['_h', '_i'].forEach((a) => {
		if (source[a] !== undefined) target[a] = source[a];
	});
};

let NAMESPACES;

const initNs = () => {
	if (config.n && !NAMESPACES) {
		NAMESPACES = window.__namespaces || {
			svg: '2000/svg',
			xlink: '1999/xlink',
			xmlns: '2000/xmlns/',
		};
		window.__namespaces = NAMESPACES;
	}
};

const getNs = (key) => {
	if (!config.j || !config.n) return null;
	const ns = NAMESPACES[key];
	if (!ns) return null;
	return ns.indexOf('http') !== 0 ? `http://www.w3.org/${ns}` : ns;
};

/**
 * Renders given AB Doer VNode.
 * @param {VNode} vnode
 * @param {VNode} [oldVnode]
 * @returns {VNode}
 */
export const renderVnode = (vnode, oldVnode) => {
	if (!config.j || !vnode) {
		return vnode;
	}

	initNs();

	/** @type {HTMLElement} */
	let element;
	const oldProps = oldVnode?.props;
	if (oldVnode) {
		copyInternal(oldVnode, vnode);
	} else {
		vnode._drt = true;
	}

	const { type: tag, props = {}, svg } = vnode;
	let children = props.children;
	const frag = isFragment(tag);

	// Handle custom components
	if (isFunction(tag) && !frag) {
		let ref = vnode;
		let newVNode;

		// Class syntax components
		if (config.c && tag.prototype?.render) {
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
				vnode._i.props = props;
				if (comp.componentDidUpdate) {
					const oldState = vnode._i._s;
					cb.push(() => comp.componentDidUpdate(oldProps, oldState));
				}
			}
			newVNode = comp.render();
			if (!isVNode(newVNode)) {
				return newVNode;
			}
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
				// delete vnode._n;
				return newVNode;
			}
		}

		newVNode.key = vnode.key;
		vnode._r = newVNode;
		children = [vnode._r];

		// If one of props is a ref, put the component instance to the ref value.
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
			} else {
				vnode._drt = true;
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
						element = config.n && svg ? document.createElementNS(getNs('svg'), tag) : document.createElement(tag);
					}
				}
			}

			if (!isSame(vnode, oldVnode)) {
				setElementAttributes(element, props, oldProps);
			}
		}

		if (!frag) vnode._n = element;
	}

	if (children?.length) {
		vnode._c = createChildren(vnode, children, oldVnode?._c);
	}

	return vnode;
};

const flatten = (items) => {
	const flat = [];

	items.forEach((item) => {
		if (isArray(item)) {
			flat.push(...flatten(item));
		} else {
			flat.push(item);
		}
	});

	return flat;
};

const getChildrenList = (children = []) => {
	const childrenMap = new Map();
	children.forEach((child) => {
		if (child?.key) childrenMap.set(child.key, child);
	});
	return { map: childrenMap, items: children };
};

/**
 * @param {VNode} vnode
 * @param {Array} children
 * @param {Array} [oldChildren]
 */
const createChildren = (vnode, children = [], oldChildren) => {
	const oldChildrenMap = getChildrenList(oldChildren).map;
	const newChildren = flatten(children).map((child, index) => {
		let oldChild;
		if (isRenderableElement(child)) {
			if (!isVNode(child)) {
				child = createVNode('', { text: child, key: `${vnode.key}${index}` });
			}
			if (vnode.svg) {
				child.svg = true;
			}
			if (!child.props.key) {
				child.key = vnode.key + index;
			}

			oldChild = oldChildrenMap.get(child.key);
			if (!isSameChild(child, oldChild)) {
				oldChild = undefined;
			}

			const newVnode = renderVnode(child, oldChild);

			if (getVNodeDom(newVnode, true) && isVNode(oldChild)) {
				oldChildrenMap.delete(oldChild.key);
			}
		}

		return child;
	});

	if (config.h || config.c) {
		// Loop all the rest old children and run unmount callbacks and finally remove them from the DOM
		for (const [_, oldChild] of oldChildrenMap) {
			runUnmountCallbacks(oldChild);
		}
	}

	return newChildren;
};

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

/**
 * Replaces the targeted DOM element with rendered VNode element's DOM node or appends the rendered VNode into the DOM node.
 * TODO: Make this less hacky
 * @param {VNode} vnode
 * @param {VNode} [prevVnode]
 * @param {HTMLElement} [targetDomNode]
 * @param {number} [atIndex]
 * @returns {HTMLElement|null} Rendered DOM tree
 */
export const patchVnodeDom = (vnode, prevVnode, targetDomNode, atIndex) => {
	const prevDom = prevVnode && getVNodeDom(prevVnode, true);
	if (!isRenderableElement(vnode)) {
		if (prevVnode) {
			domRemove(prevDom);
		}
		return vnode;
	}
	const isVnodeSame = isSameChild(vnode, prevVnode);
	if (prevDom && getVNodeDom(vnode) !== prevDom) {
		domRemove(prevDom);
	}
	let returnDom = vnode._n || createDocumentFragment();
	// VNode is a component, try to insert the rendered component
	if (vnode._r) {
		return patchVnodeDom(vnode._r, isVnodeSame ? prevVnode?._r || prevVnode : undefined, targetDomNode, atIndex);
	}
	const oldChildrenList = getChildrenList(prevVnode?._c);
	const oldChildren = oldChildrenList.items;
	const oldChildrenMap = oldChildrenList.map;
	let childrenParentNode = returnDom;
	let insertAt = 0;
	// Loop though all children and try to patch/remove them as well.
	(vnode._c || []).forEach((child, index) => {
		const oldChildVnode = (child && oldChildrenMap.get(child.key)) || oldChildren[index];
		const patchedNode = patchVnodeDom(child, (!child || isVnodeSame) && oldChildVnode, childrenParentNode, insertAt);
		if (isRenderableElement(patchedNode)) {
			insertAt++;
			// Found a match from previous children, remove it from the map so know which must removed later
			if (oldChildVnode) oldChildrenMap.delete(oldChildVnode.key);
		}
	});
	// Handle cleaning of all removed children
	for (const [_, oldChild] of oldChildrenMap) {
		patchVnodeDom(null, oldChild);
	}

	if (isRenderableElement(returnDom)) {
		if (vnode._drt && targetDomNode) {
			const domChildren = targetDomNode.childNodes;
			if (atIndex !== undefined && domChildren.length > atIndex) {
				domInsertBefore(returnDom, domChildren[atIndex]);
			} else {
				domAppend(targetDomNode, returnDom);
			}
		}
		return returnDom;
	}
	return null;
};

const renderer = document.createElement('div');

/**
 *
 * @param {HTMLElement} element
 * @param {Object} props
 * @param {Object} [oldProps]
 */
const setElementAttributes = (element, props = {}, oldProps = {}) => {
	if (element instanceof Text) {
		element.textContent = props.text;
	} else if (isDomNode(element)) {
		if (element._e) {
			Object.keys(element._e).forEach((key) => {
				element.removeEventListener(key, element._e[key]);
				delete element._e[key];
			});
		}
		const sameProps = {};
		for (let name in oldProps) {
			let value = oldProps[name];
			if (isSame(value, props[name])) {
				sameProps[name] = true;
			} else element.removeAttribute(name);
		}
		for (let name in props) {
			let value = props[name];
			if (sameProps[name] || value === undefined || /^className|children|key$/.test(name)) {
				continue;
			} else if (name === 'style') {
				value = getStyleString(value);
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
			if (typeof value === 'boolean') {
				if (name in element) {
					element[name] = value;
				}
			} else if (/^on[A-Z]/.test(name)) {
				const evtName = name.substring(2).toLowerCase();
				element.addEventListener(evtName, value);
				element._e = element._e || {};
				element._e[evtName] = value;
			} else if (value !== null) {
				value = value.toString();
				if (config.n && name.includes(':') && element.tagName != 'SVG') {
					const [ns, nsName] = name.split(':');
					element.setAttributeNS(getNs(nsName) || getNs(ns), name, value);
				} else {
					element.setAttribute(name, value);
				}
			}
		}
	}
};

/**
 * @param {VNode} vnode
 */
export const runUnmountCallbacks = (vnode) => {
	if (isVNode(vnode)) {
		if (config.h && vnode._h) {
			vnode._h.forEach((h) => {
				if (h.length === 3 && isFunction(h[2])) {
					h[2]();
				}
			});
			vnode._h = [];
		} else if (config.c && vnode._i && vnode._i.componentWillUnmount) {
			vnode._i.componentWillUnmount();
			delete vnode._i._v;
		}
		(vnode._c || []).forEach((child) => runUnmountCallbacks(child));
		if (import.meta.hot) {
			options.unmount(vnode);
		}
	}
};

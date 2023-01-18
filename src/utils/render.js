import {
	hookPointer,
	onNextTick,
	isFunction,
	isString,
	config,
	createVNode,
	domRemove,
	isArray,
	domAppend,
	createDocumentFragment,
	isSame,
	domInsertBefore,
	options,
	getNs,
	getIndexInParent,
	getVNodeDom,
	getVNodeFirstRenderedDom,
	getParent,
	isObject,
} from './internal';

/**
 * @typedef VNode
 * @prop {String} key Identifier for the VNode
 * @prop {Array} children
 * @prop {String|Function} type VNode type
 * @prop {Object} props Element/Component props
 * @prop {Array} [__hooks] Hooks of custom component
 * @prop {*} [__class] Class component instance
 * @prop {HTMLElement} [__dom] Rendered DOM node
 * @prop {VNode} [__result] Rendered VNode of custom component
 * @prop {VNode[]} [__children] Children where all renderable elements has been converted to VNodes
 * @prop {boolean} [__dirty] VNode marked as dirty and the DOM should be updated
 */

export const Fragment = (props) => props.children;

export const getTestID = () => process.env.TEST_ID;

export const isDomNode = (tag) => tag instanceof Element;

/**
 * @param {VNode} vnode
 * @returns {boolean}
 */
export const isVNode = (vnode) => !!vnode && !!vnode.props;

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
			(vnode.type === vnode2.type || (import.meta.hot && vnode.__oldType === vnode2.__oldType))));

const isFragment = (tag) => {
	if (isVNode(tag)) tag = tag.type;
	return tag === Fragment;
};

/**
 * @param {VNode} source
 * @param {VNode2} source
 */
const copyInternal = (source, target) => {
	['__hooks', '__class'].forEach((a) => {
		if (source[a] !== undefined) target[a] = source[a];
	});
};

/**
 * Renders given AB Doer VNode.
 * @param {VNode} vnode
 * @param {VNode} [oldVnode]
 * @returns {VNode}
 */
export const renderVnode = (vnode, oldVnode) => {
	if (!config.jsx || !vnode) {
		return vnode;
	}

	/** @type {HTMLElement} */
	let element;
	const oldProps = oldVnode ? oldVnode.props : undefined;
	if (oldVnode) {
		copyInternal(oldVnode, vnode);
	} else {
		vnode.__dirty = true;
	}

	const { type: tag, props = {}, svg } = vnode;
	let children = props.children;
	const frag = isFragment(tag);

	// Handle custom components
	if (isFunction(tag) && !frag) {
		let ref = vnode;
		let newVNode;

		// Class syntax components
		if (config.classComponent && tag.prototype?.render) {
			let comp = vnode.__class;
			const cb = [];
			// First render
			if (!comp) {
				vnode.__class = comp = new tag(props);
				comp.__vnode = vnode; // So render call inside of Component setState knows which VNode to render
				if (comp.componentDidMount) {
					cb.push(() => comp.componentDidMount());
				}
			}
			// Subsequent render
			else {
				vnode.__class.props = props;
				if (comp.componentDidUpdate) {
					const oldState = vnode.__class.__state;
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
			vnode.__hooks = vnode.__hooks || [];
			hookPointer.__hooks = vnode.__hooks;
			hookPointer.__current = 0;
			hookPointer.__vnode = vnode;
			newVNode = tag(props);
			if (!isVNode(newVNode)) {
				return newVNode;
			}
		}

		newVNode.key = vnode.key;
		vnode.__result = renderVnode(newVNode, oldVnode ? oldVnode.__result : undefined);

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
			if (config.extendedVnode && isDomNode(tag)) {
				element = tag;
			}

			const vnodeDom = getVNodeDom(oldVnode);
			if (!element && vnodeDom && isSameChild(oldVnode, vnode)) {
				element = vnodeDom;
			} else {
				vnode.__dirty = true;
			}

			if (!element) {
				if (!isString(tag)) return;

				// Mainly for imported svg strings. Svg element as string is much smaller than transpiled jsx result.
				// At least in Google Optimize there's quite small size limit for assets.
				if (config.extendedVnode && tag[0] === '<') {
					renderer.innerHTML = tag;
					element = renderer.firstElementChild.cloneNode(true);
					renderer.innerHTML = '';
				} else {
					if (!tag) {
						element = document.createTextNode(props.text);
					} else {
						element =
							config.namespace && svg ? document.createElementNS(getNs('svg'), tag) : document.createElement(tag);
					}
				}
			}

			if (!isSame(props, oldProps)) {
				setElementAttributes(element, props, oldProps);
				vnode.__dirty = true;
			}
		}

		if (!frag) vnode.__dom = element;
	}

	if (children) {
		vnode.__children = renderVnodeChildren(vnode, children, oldVnode?.__children);
	}

	return vnode;
};

/**
 * Creates extended map from given children and returns a getter function for fetching a child with either key or index
 * @param {VNode[]} children
 * @returns {Map<string, VNode>}
 */
const createChildrenMap = (children) => {
	const childrenMap = new Map();
	if (children) {
		children.forEach((child) => {
			if (child && child.key) {
				childrenMap.set(child.key, child);
			}
		});
	}
	return childrenMap;
};

/**
 * @param {VNode} vnode
 * @param {Array} children
 * @param {Array} [oldChildren]
 */
const renderVnodeChildren = (vnode, children, oldChildren) => {
	const childrenMap = oldChildren && createChildrenMap(oldChildren);

	const newChildren = children.map((child, index) => {
		let oldChild;
		if (isRenderableElement(child)) {
			if (isArray(child)) {
				child = createVNode(Fragment, { children: child });
			} else if (!isVNode(child)) {
				child = createVNode('', { text: child });
			} else if (vnode.svg) {
				child.svg = true;
			}

			child.key = child.props.key || '#' + index;

			oldChild = childrenMap && childrenMap.get(child.key);
			if (oldChild && !isSameChild(child, oldChild)) {
				oldChild = undefined;
			}

			const newVnode = renderVnode(child, oldChild);

			if (getVNodeDom(newVnode, true) && isVNode(oldChild)) {
				childrenMap && childrenMap.delete(oldChild.key);
			}
		}

		return child;
	});

	if ((config.hooks || config.classComponent) && childrenMap) {
		// Loop all the rest old children and run unmount callbacks and finally remove them from the DOM
		for (const oldChild of childrenMap.values()) {
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
	if (!isObject(style)) return '';

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
 * @param {VNode} vnode
 * @param {VNode} [prevVnode]
 * @param {HTMLElement} [targetDomNode]
 * @param {NumberConstructor} [atIndex]
 * @returns {HTMLElement|null} Rendered DOM tree
 */
export const patchVnodeDom = (vnode, prevVnode, targetDomNode, atIndex) => {
	// Handle case where Fragment or simila is a root of updated top level component
	if (!targetDomNode && prevVnode) {
		const someDom = getVNodeFirstRenderedDom(prevVnode);
		if (someDom) {
			targetDomNode = getParent(someDom);
			atIndex = getIndexInParent(someDom);
		}
	}
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
	let returnDom = vnode.__dom || createDocumentFragment();
	// VNode is a component, try to insert the rendered component
	if (vnode.__result) {
		return patchVnodeDom(
			vnode.__result,
			isVnodeSame ? prevVnode?.__result || prevVnode : undefined,
			targetDomNode,
			atIndex
		);
	}
	const oldChildren = prevVnode && prevVnode.__children;
	const oldChildrenMap = oldChildren && createChildrenMap(oldChildren);
	let childrenParentNode = returnDom;
	let childIndex = 0;
	// Loop though all children and try to patch/remove them as well.
	if (vnode.__children) {
		vnode.__children.forEach((child, index) => {
			const oldChildVnode = oldChildren && ((child && oldChildrenMap.get(child.key)) || oldChildren[index]);
			const patchedDomNode = patchVnodeDom(
				child,
				(!child || isVnodeSame) && oldChildVnode,
				childrenParentNode,
				childIndex
			);
			if (isRenderableElement(patchedDomNode)) {
				childIndex++;
			}
		});
	}

	if (isRenderableElement(returnDom)) {
		if ((vnode.__dirty || isFragment(vnode)) && targetDomNode) {
			const domChildren = targetDomNode.childNodes;
			if (atIndex !== undefined && domChildren.length > atIndex) {
				domInsertBefore(returnDom, domChildren[atIndex]);
			} else {
				domAppend(targetDomNode, returnDom);
			}
		}
		vnode.__dirty = undefined;
		return returnDom;
	}
	return null;
};

const renderer = config.extendedVnode && document.createElement('div');

const protectedKeysRegex = /^className|children|key$/;

/**
 *
 * @param {HTMLElement} element
 * @param {Object} props
 * @param {Object} [oldProps]
 */
const setElementAttributes = (element, props, oldProps) => {
	const nodeType = element.nodeType;
	if (nodeType === 3) {
		element.textContent = props.text;
	} else if (nodeType === 1) {
		if (element._e) {
			Object.keys(element._e).forEach((key) => {
				element.removeEventListener(key, element._e[key]);
				delete element._e[key];
			});
		}
		const sameProps = {};
		if (oldProps) {
			for (let name in oldProps) {
				if (isSame(oldProps[name], props[name])) {
					sameProps[name] = true;
				} else element.removeAttribute(name);
			}
		}
		for (let name in props) {
			let value = props[name];
			if (sameProps[name] || value === undefined || protectedKeysRegex.test(name)) {
				continue;
			}
			// Support React like innerHTML
			else if (name === 'dangerouslySetInnerHTML') {
				element.innerHTML = value.__html;
			}
			// Function and object like reference support
			else if (name === 'ref' && value) {
				if (isFunction(value)) {
					value(element);
				} else if (value.current !== undefined) {
					value.current = element;
				}
			}
			// Some DOM attributes must be booleans, key-in seems to work match them
			else if (typeof value === 'boolean') {
				if (name in element) {
					element[name] = value;
				}
			}
			// Event handlers
			else if (/^on[A-Z]/.test(name)) {
				const evtName = name.substring(2).toLowerCase();
				element.addEventListener(evtName, value);
				element._e = element._e || {};
				element._e[evtName] = value;
			} else if (value !== null) {
				value = name === 'style' ? getStyleString(value) : value.toString();
				if (config.namespace && name.includes(':') && element.tagName != 'SVG') {
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
		if (config.hooks && vnode.__hooks) {
			vnode.__hooks.forEach((h) => {
				if (h.length === 3 && isFunction(h[2])) {
					h[2]();
				}
			});
			vnode.__hooks = [];
		} else if (config.classComponent && vnode.__class && vnode.__class.componentWillUnmount) {
			vnode.__class.componentWillUnmount();
			delete vnode.__class.__vnode;
		}
		if (vnode.__children) {
			vnode.__children.forEach((child) => runUnmountCallbacks(child));
		}
		if (import.meta.hot) {
			options.unmount(vnode);
		}
	}
};

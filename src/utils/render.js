import {
	hookPointer,
	isFunction,
	isString,
	config,
	createVNode,
	domRemove,
	isSame,
	options,
	getNs,
	getVNodeDom,
	isObject,
	domReplaceWith,
	domInsertBefore,
	createDocumentFragment,
	domAppend,
} from './internal';

/**
 * @typedef VNode
 * @prop {String} key Identifier for the VNode
 * @prop {Array} children
 * @prop {String|Function} type VNode type
 * @prop {Object} props Element/Component props
 * @prop {Array} [__hooks] Hooks of custom component
 * @prop {Number} [__hookIndex] Index of the next hook
 * @prop {*} [__class] Class component instance
 * @prop {HTMLElement} [__dom] Rendered DOM node
 * @prop {VNode} [__result] Rendered VNode of custom component
 * @prop {VNode[]} [__children] Children where all renderable elements has been converted to VNodes
 * @prop {Boolean} [__dirty] Flag to indicate if VNode should be patched to DOM again
 * @prop {HTMLElement} [__parent] Parent DOM node
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
	Boolean(
		vnode &&
			vnode2 &&
			(vnode === vnode2 ||
				(vnode.key === vnode2.key &&
					vnode.type === vnode2.type &&
					// Check if type has changed in hot replacement
					(import.meta.hot && vnode.__oldType ? vnode.__oldType === vnode2.__oldType : true)))
	);

const isFragment = (tag) => {
	if (isVNode(tag)) tag = tag.type;
	return tag === Fragment;
};

/**
 * @param {VNode} source
 * @param {VNode2} source
 */
const copyInternal = (source, target) => {
	['__hooks', '__class', '__parent'].forEach((a) => {
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
	}

	const { type: tag, props = {}, svg } = vnode;
	let children = props.children;
	const frag = isFragment(tag);

	// Handle custom components
	if (isFunction(tag) && !frag) {
		let ref = vnode;
		let newVNode;

		// Class syntax components
		if (config.classComponent && tag.prototype && tag.prototype.render) {
			let componentInstance = vnode.__class;
			const lifeCycleCallbacks = [];
			// First render
			if (!componentInstance) {
				vnode.__class = componentInstance = new tag(props);
				componentInstance.__vnode = vnode; // So render call inside of Component setState knows which VNode to render
				if (componentInstance.componentDidMount) {
					lifeCycleCallbacks.push(() => componentInstance.componentDidMount());
				}
			}
			// Subsequent render
			else {
				vnode.__class.props = props;
				if (componentInstance.componentDidUpdate) {
					const oldState = vnode.__class.__state;
					lifeCycleCallbacks.push(() => componentInstance.componentDidUpdate(oldProps, oldState));
				}
			}
			newVNode = componentInstance.render();
			if (!isVNode(newVNode)) {
				return newVNode;
			}
			if (lifeCycleCallbacks.length) {
				vnode.__dirty = true;
			}
			lifeCycleCallbacks.forEach((c) => onNextTick(vnode, c()));
		}
		// Functional components
		else {
			vnode.__hooks = vnode.__hooks || [];
			vnode.__hookIndex = 0;
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

		return vnode;
	}

	// HTML/text etc elements

	// Build element if it's not a fragment
	if (!frag) {
		if (config.extendedVnode && isDomNode(tag)) {
			element = tag;
		}

		const vnodeDom = getVNodeDom(oldVnode);
		if (!element && vnodeDom && isSameChild(oldVnode, vnode)) {
			element = vnodeDom;
		}

		if (!element) {
			if (!isString(tag)) return;

			if (!tag) {
				element = document.createTextNode(props.text);
			} else if (config.extendedVnode && tag[0] === '<') {
				renderer.innerHTML = tag;
				element = renderer.firstElementChild.cloneNode(true);
				renderer.innerHTML = '';
			} else {
				element = config.namespace && svg ? document.createElementNS(getNs('svg'), tag) : document.createElement(tag);
			}
		}

		if (!isSame(props, oldProps)) {
			setElementAttributes(element, props, oldProps);
		}

		vnode.__dom = element;
	} else {
		// Create a dom node for fragments so we can follow the point in dom where elements should be inserted
		vnode.__dom = getVNodeDom(oldVnode) || document.createTextNode('');
	}

	if (children) {
		vnode.__children = renderVnodeChildren(vnode, children, oldVnode && oldVnode.__children);
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
		for (const child of children) {
			if (child && child.key) {
				childrenMap.set(child.key, child);
			}
		}
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

	const newChildren = children.flat().map((child, index) => {
		let oldChild;
		if (isRenderableElement(child)) {
			if (!isVNode(child)) {
				child = createVNode('', { text: child });
			} else if (vnode.svg) {
				child.svg = true;
			}

			child.key = child.props.key || `#${index}`;

			oldChild = childrenMap && childrenMap.get(child.key);
			if (oldChild && !isSameChild(child, oldChild)) {
				oldChild = undefined;
			}

			const newVnode = renderVnode(child, oldChild);

			if ((getVNodeDom(newVnode, true) || isFragment(newVnode)) && isVNode(oldChild)) {
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
 * @param {HTMLElement} [targetNode]
 * @returns {HTMLElement|null} Rendered DOM tree
 */
export const patchVnodeDom = (vnode, prevVnode, targetNode, prepend) => {
	const isVnodeSame = isSameChild(vnode, prevVnode);
	const prevVnodeDom = getVNodeDom(prevVnode, true);

	if (!isRenderableElement(vnode)) {
		if (prevVnode) {
			if (isFragment(prevVnode) && prevVnode.__children) {
				prevVnode.__children.forEach((child) => domRemove(getVNodeDom(child, true)));
			} else {
				domRemove(prevVnodeDom);
			}
		}
		return vnode;
	}

	let returnDom = vnode.__dom;

	if (vnode.__result) {
		vnode.__result.__parent = vnode.__parent;
		return patchVnodeDom(vnode.__result, isVnodeSame ? prevVnode?.__result || prevVnode : prevVnode, targetNode);
	}
	const vnodeChildren = vnode.__children;

	const oldChildren = prevVnode ? prevVnode.__children : null;
	const oldChildrenMap = oldChildren && createChildrenMap(oldChildren);
	const childCount = vnodeChildren ? vnodeChildren.length : 0;

	const vnodeIsFragment = isFragment(vnode);
	const childrenParentNode = vnodeIsFragment ? createDocumentFragment() : returnDom;
	let afterSibling = null;

	for (let index = 0; index < childCount; index++) {
		const childVnode = vnodeChildren[index];
		if (childVnode) {
			childVnode.__parent = childrenParentNode;
		}
		const oldChildVnodeCandidate = oldChildrenMap && childVnode?.key && oldChildrenMap.get(childVnode.key);
		const oldChildVnode = (!childVnode || isVnodeSame) && oldChildVnodeCandidate;

		if (oldChildVnode && isSameChild(childVnode, oldChildVnode)) {
			oldChildrenMap.delete(childVnode.key);
		}
		const childVnodeDom = patchVnodeDom(childVnode, oldChildVnode, afterSibling, !afterSibling);
		if (isRenderableElement(childVnodeDom)) {
			afterSibling = childVnodeDom;
		}
	}

	if (isRenderableElement(returnDom)) {
		if (prevVnodeDom && prevVnodeDom !== returnDom) {
			domReplaceWith(prevVnodeDom, returnDom);
		} else if (targetNode && targetNode.nextSibling) {
			if (returnDom !== targetNode.nextSibling) domInsertBefore(returnDom, targetNode.nextSibling);
		} else if (prepend) {
			if (vnode.__parent.firstChild !== returnDom) vnode.__parent.prepend(returnDom);
		} else if (vnode.__parent.lastChild !== returnDom) {
			domAppend(vnode.__parent, returnDom);
		}
	}

	if (vnodeIsFragment) {
		domInsertBefore(childrenParentNode, returnDom);
	}

	oldChildrenMap?.forEach((child) => {
		if (isFragment(child)) {
			child.props.children.forEach((c) => getVNodeDom(c, true)?.remove());
		} else {
			getVNodeDom(child, true)?.remove();
		}
	});

	return returnDom;
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
				} else {
					element.removeAttribute(name);
				}
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
					const lcName = name !== 'viewBox' ? name.replace(/([a-z]+)([A-Z])/g, '$1-$2').toLowerCase() : name;
					element.setAttribute(lcName, value);
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
			vnode.__hooks.forEach((hookTuple) => {
				if (hookTuple.length === 3 && isFunction(hookTuple[2])) {
					hookTuple[2]();
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
		if (import.meta.hot || process.env.TEST_ENV) {
			options.unmount(vnode);
		}
	}
};

const cbQueue = [];

export const onNextTick = (vnode, callback) => {
	if (callback) cbQueue.push(callback);
	setTimeout(() => {
		while (cbQueue.length) {
			const cb = cbQueue.shift();
			cb();
		}
		if (vnode.__dirty) {
			const old = { ...vnode };
			vnode = renderVnode(vnode, old);
			patchVnodeDom(vnode, old);
			vnode.__dirty = false;
		}
	});
};

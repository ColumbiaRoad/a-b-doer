(function () {
	'use strict';

	const domAppend = (parent, child) => {
	  parent.append(child);
	};
	const getParent = (node) => node?.parentElement;
	const domInsertBefore = (child, target) => {
	  const parent = getParent(target);
	  parent && parent.insertBefore(child, target);
	};
	const domRemove = (node) => {
	  const parent = getParent(node);
	  parent && parent.removeChild(node);
	};
	const isFunction = (fn) => typeof fn === "function";
	const isString = (str) => typeof str === "string";
	const isArray = (arr) => Array.isArray(arr);
	const isObject = (obj) => obj && typeof obj === "object";
	const createDocumentFragment = () => document.createDocumentFragment();
	const isDomFragment = (node) => node && node.nodeType === 11;
	const getVNodeDom = (vnode, recursive) => vnode ? vnode.__dom || (recursive ? getVNodeDom(vnode.__result) : vnode.__result?.__dom) : null;
	const getVNodeFirstRenderedDom = (vnode) => {
	  if (!vnode) return null;
	  if (vnode.__dom) return vnode.__dom;
	  if (vnode.__result) return getVNodeDom(vnode.__result);
	  if (vnode.__children) {
	    for (const child of vnode.__children) {
	      const dom = getVNodeDom(child);
	      if (dom && dom.nodeType < 4) {
	        return dom;
	      }
	    }
	  }
	  return null;
	};
	const config = {};
	const hookPointer = {
	  __current: 0,
	  __hooks: [],
	  __vnode: null
	};
	const isSame = (iter, iter2) => {
	  if (iter === iter2) return true;
	  if (!iter && iter2 || iter && !iter2) return false;
	  if (isObject(iter) && isObject(iter2)) {
	    let same = true;
	    const keys = [...new Set(Object.keys(iter), Object.keys(iter2))];
	    for (const key of keys) {
	      if (key === "children") continue;
	      if (iter[key] !== iter2[key]) {
	        same = isObject(iter[key]) ? isSame(iter[key], iter2[key]) : false;
	        break;
	      }
	    }
	    return same;
	  }
	  return false;
	};
	const onNextTick = (callback) => {
	  setTimeout(callback);
	};
	const createVNode = (tag = "", props) => {
	  return {
	    type: tag,
	    props,
	    key: props.key
	  };
	};
	let NAMESPACES;
	const initNs = () => {
	  if (!NAMESPACES) {
	    NAMESPACES = {
	      svg: "2000/svg",
	      xlink: "1999/xlink",
	      xmlns: "2000/xmlns/"
	    };
	  }
	};
	const getNs = (key) => {
	  if (!config.namespace) return null;
	  const ns = NAMESPACES[key];
	  if (!ns) return null;
	  return ns.indexOf("http") !== 0 ? `http://www.w3.org/${ns}` : ns;
	};

	const Fragment$1 = (props) => props.children;
	const getTestID = () => "t-pptr-toolbar";
	const isDomNode = (tag) => tag instanceof Element;
	const isVNode = (vnode) => !!vnode && !!vnode.props;
	const isRenderableElement = (element) => !!element || element === 0;
	const isSameChild = (vnode, vnode2) => vnode && vnode2 && (vnode === vnode2 || vnode.key === vnode2.key && (vnode.type === vnode2.type || undefined && vnode.__oldType && vnode.__oldType === vnode2.__oldType));
	const isFragment = (tag) => {
	  if (isVNode(tag)) tag = tag.type;
	  return tag === Fragment$1;
	};
	const copyInternal = (source, target) => {
	  ["__hooks", "__class"].forEach((a) => {
	    if (source[a] !== void 0) target[a] = source[a];
	  });
	};
	const renderVnode = (vnode, oldVnode) => {
	  if (!vnode) {
	    return vnode;
	  }
	  let element;
	  const oldProps = oldVnode ? oldVnode.props : void 0;
	  if (oldVnode) {
	    copyInternal(oldVnode, vnode);
	  } else {
	    vnode.__dirty = true;
	  }
	  const { type: tag, props = {}, svg } = vnode;
	  let children = props.children;
	  const frag = isFragment(tag);
	  if (isFunction(tag) && !frag) {
	    let ref = vnode;
	    let newVNode;
	    if (config.classComponent && tag.prototype && tag.prototype.render) {
	      let componentInstance = vnode.__class;
	      const lifeCycleCallbacks = [];
	      if (!componentInstance) {
	        vnode.__class = componentInstance = new tag(props);
	        componentInstance.__vnode = vnode;
	        if (componentInstance.componentDidMount) {
	          lifeCycleCallbacks.push(() => componentInstance.componentDidMount());
	        }
	      } else {
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
	      lifeCycleCallbacks.forEach((c) => onNextTick(c()));
	    } else {
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
	    vnode.__result = renderVnode(newVNode, oldVnode ? oldVnode.__result : void 0);
	    if (props.ref) {
	      if (isFunction(props.ref)) {
	        props.ref(ref);
	      } else if (props.ref.current !== void 0) {
	        props.ref.current = ref;
	      }
	    }
	    return vnode;
	  }
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
	      if (!tag) {
	        element = document.createTextNode(props.text);
	      } else if (config.extendedVnode && tag[0] === "<") {
	        renderer.innerHTML = tag;
	        element = renderer.firstElementChild.cloneNode(true);
	        renderer.innerHTML = "";
	      } else {
	        element = config.namespace && svg ? document.createElementNS(getNs("svg"), tag) : document.createElement(tag);
	      }
	    }
	    if (!isSame(props, oldProps)) {
	      setElementAttributes(element, props, oldProps);
	      vnode.__dirty = true;
	    }
	    vnode.__dom = element;
	  }
	  if (children) {
	    vnode.__children = renderVnodeChildren(vnode, children, oldVnode && oldVnode.__children);
	  }
	  return vnode;
	};
	const createChildrenMap = (children) => {
	  const childrenMap = /* @__PURE__ */ new Map();
	  if (children) {
	    for (const child of children) {
	      if (child && child.key) {
	        childrenMap.set(child.key, child);
	      }
	    }
	  }
	  return childrenMap;
	};
	const renderVnodeChildren = (vnode, children, oldChildren) => {
	  const childrenMap = oldChildren && createChildrenMap(oldChildren);
	  const newChildren = children.map((child, index) => {
	    let oldChild;
	    if (isRenderableElement(child)) {
	      if (isArray(child)) {
	        child = createVNode(Fragment$1, { children: child });
	      } else if (!isVNode(child)) {
	        child = createVNode("", { text: child });
	      } else if (vnode.svg) {
	        child.svg = true;
	      }
	      child.key = child.props.key || `#${index}`;
	      oldChild = childrenMap && childrenMap.get(child.key);
	      if (oldChild && !isSameChild(child, oldChild)) {
	        oldChild = void 0;
	      }
	      const newVnode = renderVnode(child, oldChild);
	      if (getVNodeDom(newVnode, true) && isVNode(oldChild)) {
	        childrenMap && childrenMap.delete(oldChild.key);
	      }
	    }
	    return child;
	  });
	  if (childrenMap) {
	    for (const oldChild of childrenMap.values()) {
	      runUnmountCallbacks(oldChild);
	    }
	  }
	  return newChildren;
	};
	const getStyleString = (style) => {
	  if (isString(style)) return style;
	  if (!isObject(style)) return "";
	  return Object.keys(style).reduce(
	    (prev, curr) => `${prev += curr.split(/(?=[A-Z])/).join("-").toLowerCase()}:${style[curr]};`,
	    ""
	  );
	};
	const patchVnodeDom = (vnode, prevVnode, targetDomNode, afterNode) => {
	  let prepend = false;
	  if ((!targetDomNode || isDomFragment(targetDomNode)) && prevVnode) {
	    const someDom = getVNodeFirstRenderedDom(prevVnode);
	    if (someDom) {
	      targetDomNode = getParent(someDom);
	      afterNode = someDom.previousSibling;
	      if (!afterNode) {
	        prepend = true;
	      }
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
	  if (vnode.__result) {
	    return patchVnodeDom(
	      vnode.__result,
	      isVnodeSame ? prevVnode?.__result || prevVnode : void 0,
	      targetDomNode,
	      afterNode
	    );
	  }
	  const oldChildren = prevVnode && prevVnode.__children;
	  const oldChildrenMap = oldChildren && createChildrenMap(oldChildren);
	  const vnodeChildren = vnode.__children;
	  const childCount = vnodeChildren && vnodeChildren.length || 0;
	  let prevNode;
	  for (let index = 0; index < childCount; index++) {
	    let child = vnodeChildren[index];
	    const oldChildVnode = oldChildren && (child && oldChildrenMap.get(child.key) || oldChildren[index]);
	    const patchedDomNode = patchVnodeDom(child, (!child || isVnodeSame) && oldChildVnode, returnDom, prevNode);
	    if (isRenderableElement(patchedDomNode)) {
	      prevNode = isDomFragment(patchedDomNode) ? patchedDomNode.lastChild : patchedDomNode;
	    }
	  }
	  if (isRenderableElement(returnDom)) {
	    if ((vnode.__dirty || isFragment(vnode)) && targetDomNode) {
	      const firstNode = targetDomNode.childNodes[0];
	      if ((prepend || firstNode === returnDom) && firstNode) {
	        domInsertBefore(returnDom, firstNode);
	      } else if (afterNode) {
	        afterNode.after(returnDom);
	      } else {
	        domAppend(targetDomNode, returnDom);
	      }
	    }
	    vnode.__dirty = void 0;
	    return returnDom;
	  }
	  return null;
	};
	const renderer = config.extendedVnode && document.createElement("div");
	const protectedKeysRegex = /^className|children|key$/;
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
	      if (sameProps[name] || value === void 0 || protectedKeysRegex.test(name)) {
	        continue;
	      } else if (name === "dangerouslySetInnerHTML") {
	        element.innerHTML = value.__html;
	      } else if (name === "ref" && value) {
	        if (isFunction(value)) {
	          value(element);
	        } else if (value.current !== void 0) {
	          value.current = element;
	        }
	      } else if (typeof value === "boolean") {
	        if (name in element) {
	          element[name] = value;
	        }
	      } else if (/^on[A-Z]/.test(name)) {
	        const evtName = name.substring(2).toLowerCase();
	        element.addEventListener(evtName, value);
	        element._e = element._e || {};
	        element._e[evtName] = value;
	      } else if (value !== null) {
	        value = name === "style" ? getStyleString(value) : value.toString();
	        if (config.namespace && name.includes(":") && element.tagName != "SVG") {
	          const [ns, nsName] = name.split(":");
	          element.setAttributeNS(getNs(nsName) || getNs(ns), name, value);
	        } else {
	          element.setAttribute(name, value);
	        }
	      }
	    }
	  }
	};
	const runUnmountCallbacks = (vnode) => {
	  if (isVNode(vnode)) {
	    if (vnode.__hooks) {
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
	  }
	};

	if (config.namespace) {
	  initNs();
	}
	const createElement = (tag, props, ...children) => {
	  props = props || {};
	  if (config.className) {
	    if (props.class) {
	      props.className = props.class;
	    } else if (props.className) {
	      props.class = props.className;
	    }
	  }
	  props.children = children;
	  const vnode = createVNode(tag, props);
	  if (tag === "svg") {
	    vnode.svg = true;
	  }
	  return vnode;
	};
	const h = createElement;

	const jsx = (type, props, key) => {
	  props.key = key;
	  const children = isArray(props.children) ? props.children : [props.children];
	  return h(type, props, ...children);
	};
	const jsxs = jsx;

	const getChildrenArray = (child) => {
	  if (isArray(child)) return child;
	  if (!child) return [];
	  return isDomFragment(child) ? Array.from(child.children) : [child];
	};
	const clearPrevious = (child, parent) => {
	  const children = getChildrenArray(child);
	  children.forEach((child2) => {
	    let id;
	    if (isVNode(child2)) {
	      id = child2.key;
	    } else {
	      id = child2.dataset?.o;
	    }
	    if (id) {
	      Array.from(parent.children).forEach((child3) => {
	        if (child3.dataset?.o === id) {
	          domRemove(child3);
	        }
	      });
	    }
	  });
	};
	const createMutation = (child) => {
	  let node = child;
	  if (isVNode(child)) {
	    node = patchVnodeDom(renderVnode(child)) || createDocumentFragment();
	  }
	  getChildrenArray(node).forEach((c) => {
	    if (c.dataset && !c.dataset.o) {
	      c.dataset.o = node.key || getTestID();
	    }
	  });
	  return node;
	};
	const append = (vnode, parent, clearPrev = true) => {
	  const child = createMutation(vnode);
	  if (clearPrev) {
	    clearPrevious(child, parent);
	  }
	  domAppend(parent, child);
	  return vnode;
	};

	const Fragment = Fragment$1;

	const useRef = (current = null) => {
	  if (!hookPointer.__hooks[hookPointer.__current]) {
	    hookPointer.__hooks[hookPointer.__current] = { current };
	  }
	  const ret = hookPointer.__hooks[hookPointer.__current];
	  hookPointer.__current++;
	  return ret;
	};
	const useEffect = (cb, deps) => {
	  const oldDeps = hookPointer.__hooks[hookPointer.__current]?.[1];
	  let shouldCall = !oldDeps || !deps;
	  if (!shouldCall && deps) {
	    shouldCall = !isSame(deps, oldDeps || []);
	  }
	  if (shouldCall) {
	    if (oldDeps && hookPointer.__hooks[hookPointer.__current][2]) {
	      hookPointer.__hooks[hookPointer.__current][2]();
	    }
	    hookPointer.__hooks[hookPointer.__current] = ["e", deps, null];
	    ((hooks, index) => {
	      onNextTick(() => {
	        hooks[index][2] = cb();
	      });
	    })(hookPointer.__hooks, hookPointer.__current);
	  }
	  hookPointer.__current++;
	};
	const useState = (defaultValue) => {
	  if (!hookPointer.__hooks[hookPointer.__current]) {
	    hookPointer.__hooks[hookPointer.__current] = [defaultValue];
	  }
	  hookPointer.__hooks[hookPointer.__current][1] = /* @__PURE__ */ ((hooks, index, vnode) => (value) => {
	    hooks[index][0] = value;
	    if (vnode) {
	      onNextTick(() => {
	        const old = { ...vnode };
	        vnode.__hooks = hooks;
	        vnode = renderVnode(vnode, old);
	        patchVnodeDom(vnode, old);
	      });
	    }
	  })(hookPointer.__hooks, hookPointer.__current, hookPointer.__vnode);
	  const state = hookPointer.__hooks[hookPointer.__current];
	  hookPointer.__current++;
	  return state;
	};

	const wait = (waitTime) => new Promise((resolve) => setTimeout(resolve, waitTime));

	var e=[],t=[];function n(n,r){if(n&&"undefined"!=typeof document){var a,s=!0===r.prepend?"prepend":"append",d=!0===r.singleTag,i="string"==typeof r.container?document.querySelector(r.container):document.getElementsByTagName("head")[0];if(d){var u=e.indexOf(i);-1===u&&(u=e.push(i)-1,t[u]={}),a=t[u]&&t[u][s]?t[u][s]:t[u][s]=c();}else a=c();65279===n.charCodeAt(0)&&(n=n.substring(1)),a.styleSheet?a.styleSheet.cssText+=n:a.appendChild(document.createTextNode(n));}function c(){var e=document.createElement("style");if(e.setAttribute("type","text/css"),r.attributes)for(var t=Object.keys(r.attributes),n=0;n<t.length;n++)e.setAttribute(t[n],r.attributes[t[n]]);var a="prepend"===s?"afterbegin":"beforeend";return i.insertAdjacentElement(a,e),e}}

	var css$3 = ".styles_toggle__03861b34 {\n  display: flex;\n  align-items: center;\n}\n.styles_toggle__03861b34 input {\n  display: none !important;\n}\n.styles_toggle__03861b34 input:checked + .styles_icon__03861b34 {\n  border-color: #288fb0;\n}\n.styles_toggle__03861b34 input:checked + .styles_icon__03861b34 span {\n  transform: translateX(16px);\n  background: #288fb0;\n}\n.styles_toggle__03861b34 .styles_icon__03861b34 {\n  border: 2px solid #ccc;\n  width: 40px;\n  height: 22px;\n  border-radius: 12px;\n  position: relative;\n  display: inline-block;\n  cursor: pointer;\n  transition: border 0.3s ease-in-out;\n  margin-right: 13px;\n}\n.styles_toggle__03861b34 .styles_icon__03861b34 span {\n  height: 16px;\n  width: 16px;\n  border-radius: 10px;\n  background: #ccc;\n  transition: all 0.3s ease-in-out;\n  position: absolute;\n  left: 2px;\n  top: 1px;\n}";
	var modules_ed59282c$3 = {"toggle":"styles_toggle__03861b34","icon":"styles_icon__03861b34"};
	n(css$3,{"container":"body","singleTag":true,"prepend":true,"attributes":{"id":"pptr-toolbar-styles"}});

	const Toggle = ({ label, onChange, value = false }) => {
	  return /* @__PURE__ */ jsxs("label", { class: modules_ed59282c$3.toggle, children: [
	    /* @__PURE__ */ jsx("input", { type: "checkbox", checked: value, onChange }),
	    /* @__PURE__ */ jsx("span", { class: modules_ed59282c$3.icon, children: /* @__PURE__ */ jsx("span", {}) }),
	    label
	  ] });
	};

	var css$2 = ".styles_spinner__4bec6dfe {\n  border: 3px solid #fff;\n  border-radius: 50%;\n  display: inline-block;\n  position: relative;\n  box-sizing: border-box;\n  animation: styles_rotation__4bec6dfe 1s linear infinite;\n}\n\n.styles_spinner__4bec6dfe::after {\n  content: \"\";\n  box-sizing: border-box;\n  position: absolute;\n  left: 50%;\n  top: 50%;\n  transform: translate(-50%, -50%);\n  width: calc(100% - 8px);\n  height: calc(100% - 8px);\n  border-radius: 50%;\n  border: 3px solid transparent;\n  border-bottom-color: #ff3d00;\n}\n\n@keyframes styles_rotation__4bec6dfe {\n  0% {\n    transform: rotate(0deg);\n  }\n  100% {\n    transform: rotate(360deg);\n  }\n}";
	var modules_ed59282c$2 = {"spinner":"styles_spinner__4bec6dfe","rotation":"styles_rotation__4bec6dfe"};
	n(css$2,{"container":"body","singleTag":true,"prepend":true,"attributes":{"id":"pptr-toolbar-styles"}});

	const Spinner = (props) => {
	  const { size = 48 } = props;
	  return /* @__PURE__ */ jsx("span", { className: `${modules_ed59282c$2.spinner} pptr-toolbar-spinner`, style: { width: `${size}px`, height: `${size}px` } });
	};

	var css$1 = ".styles_button__6435f5e2 {\n  display: block;\n  width: 100%;\n  background: #767676;\n  color: #fff;\n  margin: 10px 0 !important;\n  padding: 10px 15px !important;\n  border: 0 !important;\n  border-radius: 4px;\n  transition: all 0.3s ease-in-out;\n  position: relative;\n}\n.styles_button__6435f5e2:hover {\n  background: #5b5b5b;\n}\n.styles_button__6435f5e2 .pptr-toolbar-spinner {\n  position: absolute;\n  left: 2px;\n  top: 2px;\n}\n\n.styles_loading__6435f5e2 {\n  margin: 10px auto !important;\n  width: 34px;\n  height: 34px;\n  padding: 0 !important;\n  border-radius: 17px;\n}";
	var modules_ed59282c$1 = {"button":"styles_button__6435f5e2","loading":"styles_loading__6435f5e2"};
	n(css$1,{"container":"body","singleTag":true,"prepend":true,"attributes":{"id":"pptr-toolbar-styles"}});

	console.log(modules_ed59282c$1);
	const Button = (props) => {
	  const { loading, children, ...restProps } = props;
	  return /* @__PURE__ */ jsx("button", { className: [modules_ed59282c$1.button, loading && modules_ed59282c$1.loading].filter(Boolean).join(" "), ...restProps, children: loading ? /* @__PURE__ */ jsx(Spinner, { size: 30 }) : children });
	};

	var css = ".styles_toolbar__876f3b1f {\n  position: fixed;\n  bottom: 0;\n  left: 0;\n  padding: 15px;\n  z-index: 9999;\n  background: #fff;\n  text-align: left;\n  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);\n  font-size: 14px;\n  transition: transform 0.3s ease-in-out;\n  width: 250px;\n  box-sizing: border-box;\n}\n.styles_toolbar__876f3b1f * {\n  box-sizing: border-box;\n  font: normal 14px/14px arial, sans-serif !important;\n}\n.styles_toolbar__876f3b1f div {\n  text-align: left;\n  word-break: break-all;\n}\n.styles_toolbar__876f3b1f small {\n  font-size: 0.9em !important;\n}\n.styles_toolbar__876f3b1f small label {\n  display: flex !important;\n  align-items: center !important;\n}\n.styles_toolbar__876f3b1f.styles_closed__876f3b1f {\n  transform: translateX(calc(-100% - 15px));\n}\n.styles_toolbar__876f3b1f.styles_open__876f3b1f {\n  transform: translateX(0);\n}\n.styles_toolbar__876f3b1f hr {\n  height: 1px;\n  background: #ccc;\n  border: 0;\n  margin: 16px 0;\n}\n.styles_toolbar__876f3b1f a {\n  cursor: pointer;\n  display: inline-block;\n  padding: 5px 10px;\n  line-height: 14px;\n  font-family: arial, sans-serif;\n  border-radius: 4px;\n  transition: all 0.3s ease-out;\n}\n.styles_toolbar__876f3b1f a:hover {\n  background: rgba(0, 0, 0, 0.15);\n}\n.styles_toolbar__876f3b1f img {\n  width: 50px;\n  margin: 0 auto 15px;\n  display: block;\n}\n.styles_toolbar__876f3b1f .styles_toggle__876f3b1f {\n  position: absolute;\n  right: -40px;\n  bottom: 0;\n  box-shadow: 5px 0 5px rgba(0, 0, 0, 0.5);\n  background: #fff !important;\n  border-radius: 0 5px 0px 0;\n  width: 50px;\n  height: 40px;\n  border: 0 !important;\n  margin: 0 !important;\n  padding: 0 !important;\n  transition: all 0.3s ease-in-out;\n  transform: translate(-11px, 26px);\n  cursor: pointer;\n}\n.styles_toolbar__876f3b1f .styles_toggle__876f3b1f::before, .styles_toolbar__876f3b1f .styles_toggle__876f3b1f::after {\n  content: \"\";\n  width: 14px;\n  height: 1px;\n  background: #000;\n  transform: rotate(45deg);\n  position: absolute;\n  top: 16px;\n  left: 23px;\n  transition: transform 0.15s ease-in-out;\n}\n.styles_toolbar__876f3b1f .styles_toggle__876f3b1f::after {\n  transform: rotate(-45deg);\n  top: 26px;\n}\n.styles_toolbar__876f3b1f .styles_toggle__876f3b1f:hover {\n  transform: translate(15px, 0);\n}\n.styles_toolbar__876f3b1f.styles_open__876f3b1f .styles_toggle__876f3b1f {\n  transform: translate(0, 0);\n}\n.styles_toolbar__876f3b1f.styles_open__876f3b1f .styles_toggle__876f3b1f::before {\n  transform: rotate(-45deg);\n}\n.styles_toolbar__876f3b1f.styles_open__876f3b1f .styles_toggle__876f3b1f::after {\n  transform: rotate(45deg);\n}";
	var modules_ed59282c = {"toolbar":"styles_toolbar__876f3b1f","closed":"styles_closed__876f3b1f","open":"styles_open__876f3b1f","toggle":"styles_toggle__876f3b1f"};
	n(css,{"container":"body","singleTag":true,"prepend":true,"attributes":{"id":"pptr-toolbar-styles"}});

	const logo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJUAAAByCAMAAABtPWNHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAE9GlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNy4xLWMwMDAgNzkuOWNjYzRkZTkzLCAyMDIyLzAzLzE0LTE0OjA3OjIyICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjMuMyAoTWFjaW50b3NoKSIgeG1wOkNyZWF0ZURhdGU9IjIwMjItMDYtMDNUMTY6MjI6NDIrMDM6MDAiIHhtcDpNb2RpZnlEYXRlPSIyMDIyLTA2LTA0VDEwOjEwOjQ4KzAzOjAwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDIyLTA2LTA0VDEwOjEwOjQ4KzAzOjAwIiBkYzpmb3JtYXQ9ImltYWdlL3BuZyIgcGhvdG9zaG9wOkNvbG9yTW9kZT0iMyIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpkMDA1NzFlMS03M2QyLTRjZjUtODhjYS00YWIyMTJhNzMyN2IiIHhtcE1NOkRvY3VtZW50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";
	const Toolbar = ({ config, testPath, testId, customToolbar }) => {
	  const [open, setOpen] = useState(false);
	  const [visible, setVisible] = useState(true);
	  const [highlight, setHighlight] = useState(false);
	  const [disabled, setDisable] = useState(config.disabled);
	  const [fullscreen, setFullscreen] = useState(true);
	  const [screenshotLoading, setScreenshotLoading] = useState(false);
	  const [screenshotCbLoading, setScreenshotCbLoading] = useState(false);
	  const ref = useRef();
	  useEffect(() => {
	    window.addEventListener("keyup", (evt) => {
	      if (!visible && evt.key === "Escape") {
	        setVisible(true);
	      }
	    });
	  }, [visible]);
	  const toggles = [
	    {
	      label: "Highlight injections",
	      value: highlight,
	      onChange: () => {
	        if (!highlight) {
	          showInjectionBorders(testId);
	        } else {
	          hideInjectionBorders();
	        }
	        setHighlight(!highlight);
	      }
	    },
	    {
	      label: "Disable current injection",
	      value: disabled,
	      onChange: () => {
	        setDisable(!disabled);
	        window.toggleInjection();
	        location.reload();
	      }
	    }
	  ];
	  return /* @__PURE__ */ jsxs(
	    "div",
	    {
	      id: "a-b-toolbar",
	      class: `${modules_ed59282c.toolbar} ${open ? modules_ed59282c.open : modules_ed59282c.closed}`,
	      ref,
	      style: { display: visible ? "block" : "none" },
	      children: [
	        /* @__PURE__ */ jsx("img", { src: logo }),
	        toggles.map((tgl, index) => /* @__PURE__ */ jsxs(Fragment, { children: [
	          /* @__PURE__ */ jsx(Toggle, { ...tgl }),
	          /* @__PURE__ */ jsx("hr", {})
	        ] }, `toggle${index}`)),
	        /* @__PURE__ */ jsxs("div", { children: [
	          "In preview: ",
	          /* @__PURE__ */ jsx("small", { children: testPath })
	        ] }),
	        /* @__PURE__ */ jsx(
	          Button,
	          {
	            loading: screenshotLoading,
	            onClick: async () => {
	              setScreenshotLoading(true);
	              await wait(200);
	              setVisible(false);
	              await window.takeScreenshot(fullscreen);
	              setVisible(true);
	              setScreenshotLoading(false);
	            },
	            children: "Take screenshot"
	          }
	        ),
	        /* @__PURE__ */ jsx(
	          Button,
	          {
	            loading: screenshotCbLoading,
	            onClick: async () => {
	              setScreenshotCbLoading(true);
	              await wait(200);
	              setVisible(false);
	              const imageStr = await window.takeScreenshot(fullscreen, true);
	              const imageBase64 = `data:image/png;base64,${imageStr}`;
	              const image = new Image();
	              image.style.display = "none";
	              image.addEventListener("load", () => {
	                const canvas = document.createElement("canvas");
	                const ctx = canvas.getContext("2d");
	                canvas.width = image.naturalWidth;
	                canvas.height = image.naturalHeight;
	                ctx.drawImage(image, 0, 0);
	                canvas.toBlob(async (blob) => {
	                  setVisible(true);
	                  if (!blob) {
	                    console.log("Failed to add the screenshot to clipboard.");
	                    return;
	                  }
	                  await navigator.clipboard.write([
	                    new ClipboardItem({
	                      [blob.type]: blob
	                    })
	                  ]);
	                  setScreenshotCbLoading(false);
	                });
	                console.log("Screenshot copied to clipboard.");
	              });
	              image.src = imageBase64;
	            },
	            children: "Take screenshot (clipboard)"
	          }
	        ),
	        /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx("small", { children: /* @__PURE__ */ jsxs("label", { children: [
	          /* @__PURE__ */ jsx(
	            "input",
	            {
	              type: "checkbox",
	              checked: fullscreen,
	              onChange: () => setFullscreen(!fullscreen),
	              style: {
	                display: "inline",
	                width: "auto",
	                padding: 0,
	                margin: "0 5px 0 0",
	                border: 0
	              }
	            }
	          ),
	          " ",
	          "Full page screenshot"
	        ] }) }) }),
	        /* @__PURE__ */ jsx("hr", {}),
	        /* @__PURE__ */ jsx(
	          "button",
	          {
	            class: modules_ed59282c.previewButton,
	            onClick: () => {
	              console.log(
	                "%c A/B Doer test config\n",
	                "color: cyan; font-size: 1.5em; text-shadow: 1px 1px 1px #000",
	                config
	              );
	            },
	            children: "Print generated config"
	          }
	        ),
	        /* @__PURE__ */ jsx("hr", {}),
	        customToolbar && /* @__PURE__ */ jsx("section", { dangerouslySetInnerHTML: { __html: customToolbar } }),
	        /* @__PURE__ */ jsx(
	          "a",
	          {
	            onClick: () => {
	              hideInjectionBorders();
	              setHighlight(false);
	              setVisible(false);
	            },
	            children: "Remove toolbar DOM"
	          }
	        ),
	        /* @__PURE__ */ jsx("div", { style: { fontSize: "12px !important", padding: "5px 10px" }, children: "(Press esc to display it again)" }),
	        /* @__PURE__ */ jsx("button", { class: modules_ed59282c.toggle, onClick: () => setOpen(!open), title: "Toggle A/B test toolbar" })
	      ]
	    }
	  );
	};
	function showInjectionBorders(testId) {
	  document.querySelectorAll("[data-o]").forEach((node) => {
	    if (node.dataset.o === "tlbr01") {
	      return;
	    }
	    if (node.dataset.o === testId) {
	      node.style.boxShadow = "inset 0 0 5px #0012ff, 0 0 5px #0012ff";
	    } else {
	      node.style.boxShadow = "inset 0 0 5px #f00, 0 0 5px #f00";
	    }
	  });
	}
	function hideInjectionBorders() {
	  document.querySelectorAll("[data-o]").forEach((node) => {
	    node.style.boxShadow = null;
	  });
	}

	const container = document.createElement("div");
	container.id = "pptr-toolbar";
	container.style.all = "unset";
	const shadow = container.attachShadow({ mode: "open" });
	const styles = document.getElementById("pptr-toolbar-styles");
	shadow.appendChild(styles);
	document.body.appendChild(container);
	append(
	  /* @__PURE__ */ jsx(Toolbar, { testId: window.abPreview.testId, config: window.abPreview.config, testPath: window.abPreview.testPath }),
	  shadow
	);

})();

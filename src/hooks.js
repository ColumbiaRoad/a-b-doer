/**
 * @typedef {Object} Ref
 * @property {*|null} current
 */

import { hookPointer, isSame, onNextTick, getVNodeDom } from './utils/internal';
import { renderVnode, patchVnodeDom } from './utils/render';

/**
 * Initializes the reference object.
 * @param {*} current Initial value
 * @returns {Ref}
 */
export const useRef = (current = null) => {
	if (!hookPointer.__hooks[hookPointer.__current]) {
		hookPointer.__hooks[hookPointer.__current] = { current };
	}
	const ret = hookPointer.__hooks[hookPointer.__current];
	hookPointer.__current++;
	return ret;
};

export const useEffect = (cb, deps) => {
	const oldDeps = hookPointer.__hooks[hookPointer.__current]?.[1];
	let shouldCall = !oldDeps || !deps;
	if (!shouldCall && deps) {
		shouldCall = !isSame(deps, oldDeps || []);
	}
	if (shouldCall) {
		if (oldDeps && hookPointer.__hooks[hookPointer.__current][2]) {
			hookPointer.__hooks[hookPointer.__current][2]();
		}
		hookPointer.__hooks[hookPointer.__current] = ['e', deps, null];
		((hooks, index) => {
			onNextTick(() => {
				hooks[index][2] = cb();
			});
		})(hookPointer.__hooks, hookPointer.__current);
	}
	hookPointer.__current++;
};

export const useState = (defaultValue) => {
	if (!hookPointer.__hooks[hookPointer.__current]) {
		hookPointer.__hooks[hookPointer.__current] = [defaultValue];
	}

	hookPointer.__hooks[hookPointer.__current][1] = ((hooks, index, vnode) => (value) => {
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

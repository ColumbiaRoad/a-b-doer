/**
 * @typedef {Object} Ref
 * @property {*|null} current
 */

import { hooks, isSame, onNextTick } from './utils/internal';
import { renderVnode, patchVnodeDom } from './utils/render';

/**
 * Initializes the reference object.
 * @param {*} current Initial value
 * @returns {Ref}
 */
export const useRef = (current = null) => {
	if (!hooks.__hooks[hooks.__current]) {
		hooks.__hooks[hooks.__current] = { current };
	}
	const ret = hooks.__hooks[hooks.__current];
	hooks.__current++;
	return ret;
};

export const useEffect = (cb, deps) => {
	const oldDeps = hooks.__hooks[hooks.__current]?.[1];
	let shouldCall = !oldDeps || !deps;
	if (!shouldCall && deps) {
		shouldCall = !isSame(deps, oldDeps || []);
	}
	if (shouldCall) {
		if (oldDeps && hooks.__hooks[hooks.__current][2]) {
			hooks.__hooks[hooks.__current][2]();
		}
		hooks.__hooks[hooks.__current] = ['e', deps, null];
		((hooks, index) => {
			onNextTick(() => {
				hooks[index][2] = cb();
			});
		})(hooks.__hooks, hooks.__current);
	}
	hooks.__current++;
};

export const useState = (defaultValue) => {
	if (!hooks.__hooks[hooks.__current]) {
		hooks.__hooks[hooks.__current] = [defaultValue];
	}

	hooks.__hooks[hooks.__current][1] = ((hooks, index, vnode) => (value) => {
		hooks[index][0] = value;
		if (vnode) {
			onNextTick(() => {
				const old = { ...vnode };
				vnode._h = hooks;
				vnode = renderVnode(vnode, old);
				patchVnodeDom(vnode, old);
			});
		}
	})(hooks.__hooks, hooks.__current, hooks.__vnode);

	const state = hooks.__hooks[hooks.__current];
	hooks.__current++;
	return state;
};

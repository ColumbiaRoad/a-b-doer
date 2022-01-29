/**
 * @typedef {Object} Ref
 * @property {*|null} current
 */

import { config, hooks, isSame, onNextTick } from './utils/internal';
import { renderVnode, patchVnodeDom } from './utils/render';

config.h = true;

/**
 * Initializes the reference object.
 * @param {*} current Initial value
 * @returns {Ref}
 */
export const useRef = (current = null) => {
	if (!hooks.h[hooks.c]) {
		hooks.h[hooks.c] = { current };
	}
	const ret = hooks.h[hooks.c];
	hooks.c++;
	return ret;
};

/**
 * Runs given function in the next tick.
 * @param {Function} cb
 */
export const useHook = (cb) => {
	onNextTick(cb);
};

export const useEffect = (cb, deps) => {
	const oldDeps = hooks.h[hooks.c]?.[1];
	let shouldCall = !oldDeps || !deps;
	if (!shouldCall && deps) {
		shouldCall = !isSame(deps, oldDeps || []);
	}
	if (shouldCall) {
		if (oldDeps && hooks.h[hooks.c][2]) {
			hooks.h[hooks.c][2]();
		}
		hooks.h[hooks.c] = ['e', deps, null];
		((hooks, index) => {
			onNextTick(() => {
				hooks[index][2] = cb();
			});
		})(hooks.h, hooks.c);
	}
	hooks.c++;
};

export const useState = (defaultValue) => {
	if (!hooks.h[hooks.c]) {
		hooks.h[hooks.c] = [defaultValue];
	}

	hooks.h[hooks.c][1] = ((hooks, index, vnode) => (value) => {
		hooks[index][0] = value;
		if (vnode) {
			onNextTick(() => {
				const old = { ...vnode };
				vnode._h = hooks;
				vnode = renderVnode(vnode, old);
				patchVnodeDom(vnode, old);
			});
		}
	})(hooks.h, hooks.c, hooks.v);

	const state = hooks.h[hooks.c];
	hooks.c++;
	return state;
};

/**
 * @typedef {Object} Ref
 * @property {*|null} current
 */

import { hooks } from './src/utils/internal';
import { render } from './src/utils/render';

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
	setTimeout(cb, 0);
};

export const useEffect = (cb, deps) => {
	const oldDeps = hooks.h[hooks.c]?.[1];
	let shouldCall = !oldDeps || !deps;
	if (!shouldCall && deps) {
		for (let index = 0; index < deps.length; index++) {
			if (deps[index] !== oldDeps[index]) {
				shouldCall = true;
				break;
			}
		}
	}
	if (shouldCall) {
		if (oldDeps && hooks.h[hooks.c][2]) hooks.h[hooks.c][2]();
		hooks.h[hooks.c] = ['e', deps, null];
		((hooks, index) => {
			setTimeout(() => {
				hooks[index][2] = cb();
			});
		})(hooks.h, hooks.c);
	}
	hooks.c++;
};

export const useState = (defaultValue) => {
	if (!hooks.h[hooks.c]) {
		hooks.h[hooks.c] = [
			defaultValue,
			((hooks, index, vnode) => (value) => {
				hooks[index][0] = value;
				if (vnode) {
					setTimeout(() => {
						render(vnode);
					});
				}
			})(hooks.h, hooks.c, hooks.v),
		];
	}
	const state = hooks.h[hooks.c];
	hooks.c++;
	return state;
};

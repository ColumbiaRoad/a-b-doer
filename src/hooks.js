/**
 * @typedef {Object} Ref
 * @property {*|null} current
 */

import { hooks } from './utils/internal';
import { render } from './utils/render';

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
	const oldDeps = hooks.h[hooks.c] || [];
	let same = true;
	for (let index = 0; index < deps.length; index++) {
		if (deps[index] !== oldDeps[index]) {
			same = false;
			break;
		}
	}
	if (!same) {
		hooks.h[hooks.c] = deps;
		setTimeout(cb);
	}
	hooks.c++;
};

export const useState = (defaultValue) => {
	if (!hooks.h[hooks.c]) {
		hooks.h[hooks.c] = [
			defaultValue,
			((index, vnode) => (value) => {
				hooks.h[index][0] = value;
				if (vnode) {
					setTimeout(() => {
						render(vnode);
					});
				}
			})(hooks.c, hooks.v),
		];
	}
	const state = hooks.h[hooks.c];
	hooks.c++;
	return state;
};

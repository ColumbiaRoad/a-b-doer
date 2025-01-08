/**
 * @typedef {Object} Ref
 * @property {*|null} current
 */

import { onNextTick } from './utils/render';
import { hookPointer, isSame } from './utils/internal';

/**
 * Initializes the reference object.
 * @param {*} current Initial value
 * @returns {Ref}
 */
export const useRef = (current = null) => {
	const vnode = hookPointer.__vnode;
	if (!vnode.__hooks[vnode.__hookIndex]) {
		vnode.__hooks[vnode.__hookIndex] = { current };
	}
	const ret = vnode.__hooks[vnode.__hookIndex];
	vnode.__hookIndex++;
	return ret;
};

export const useEffect = (cb, deps) => {
	const vnode = hookPointer.__vnode;
	const index = vnode.__hookIndex;
	const hooks = vnode.__hooks;
	const oldDeps = hooks[index]?.[1];
	let shouldCall = !oldDeps || !deps;
	if (!shouldCall && deps) {
		shouldCall = !isSame(deps, oldDeps || []);
	}
	if (shouldCall) {
		if (oldDeps && hooks[index][2]) {
			hooks[index][2]();
		}
		hooks[index] = ['e', deps, null];
		onNextTick(vnode, () => {
			if (hooks[index]) hooks[index][2] = cb();
		});
	}
	vnode.__hookIndex = index + 1;
};

export const useState = (defaultValue) => {
	const vnode = hookPointer.__vnode;
	const index = vnode.__hookIndex;
	const hooks = vnode.__hooks;
	if (!hooks[index]) {
		hooks[index] = [defaultValue];
	}

	hooks[index][1] = (value) => {
		if (!hooks[index]) return;
		if (hooks[index][0] === value) return;
		hooks[index][0] = value;
		if (vnode) {
			vnode.__dirty = true;
			onNextTick(vnode);
		}
	};

	const state = hooks[index];
	vnode.__hookIndex = index + 1;
	return state;
};

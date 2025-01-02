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
	let index = vnode.__hookIndex;
	const oldDeps = vnode.__hooks[index]?.[1];
	let shouldCall = !oldDeps || !deps;
	if (!shouldCall && deps) {
		shouldCall = !isSame(deps, oldDeps || []);
	}
	if (shouldCall) {
		if (oldDeps && vnode.__hooks[index][2]) {
			vnode.__hooks[index][2]();
		}
		vnode.__hooks[index] = ['e', deps, null];
		((vnode, index) => {
			onNextTick(vnode, () => {
				if (vnode.__hooks[index]) vnode.__hooks[index][2] = cb();
			});
		})(vnode, index);
	}
	vnode.__hookIndex = index + 1;
};

export const useState = (defaultValue) => {
	const vnode = hookPointer.__vnode;
	if (!vnode.__hooks[vnode.__hookIndex]) {
		vnode.__hooks[vnode.__hookIndex] = [defaultValue];
	}

	vnode.__hooks[vnode.__hookIndex][1] = ((vnode, index) => (value) => {
		const hooks = vnode.__hooks;
		if (!hooks[index]) return;
		if (hooks[index][0] === value) return;
		hooks[index][0] = value;
		if (vnode) {
			vnode.__dirty = true;
			onNextTick(vnode);
		}
	})(vnode, vnode.__hookIndex);

	const state = vnode.__hooks[vnode.__hookIndex];
	vnode.__hookIndex++;
	return state;
};

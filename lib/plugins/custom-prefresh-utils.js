import { options, renderVnode, patchVnodeDom } from 'a-b-doer/internal';

const vnodesForComponent = new WeakMap();
const mappedVNodes = new WeakMap();

const getMappedVnode = (type) => {
	if (mappedVNodes.has(type)) {
		return getMappedVnode(mappedVNodes.get(type));
	}
	return type;
};

const oldVnode = options.vnode;
options.vnode = (vnode) => {
	if (vnode && typeof vnode.type === 'function') {
		const vnodes = vnodesForComponent.get(vnode.type);
		if (!vnodes) {
			vnodesForComponent.set(vnode.type, [vnode]);
		} else {
			vnodes.push(vnode);
		}
		const foundType = getMappedVnode(vnode.type);
		if (foundType !== vnode.type) {
			const vnodes = vnodesForComponent.get(foundType);
			if (!vnodes) {
				vnodesForComponent.set(foundType, [vnode]);
			} else {
				vnodes.push(vnode);
			}
		}
		vnode.type = foundType;
		if (vnode._i && 'prototype' in vnode.type && vnode.type.prototype.render) {
			vnode._i.constructor = vnode.type;
		}
	}
	oldVnode(vnode);
};

const oldUnmount = options.unmount;
options.unmount = (vnode) => {
	const type = (vnode || {}).type;
	if (typeof type === 'function' && vnodesForComponent.has(type)) {
		const vnodes = vnodesForComponent.get(type);
		if (vnodes) {
			const index = vnodes.indexOf(vnode);
			if (index !== -1) {
				vnodes.splice(index, 1);
			}
		}
	}
	oldUnmount(vnode);
};

function replaceComponent(OldType, NewType, resetHookState) {
	let pendingUpdates = self.__PREFRESH__.getPendingUpdates();

	const vnodes = vnodesForComponent.get(OldType);
	if (!vnodes) return;

	vnodesForComponent.delete(OldType);
	vnodesForComponent.set(NewType, vnodes);

	mappedVNodes.set(OldType, NewType);

	// pendingUpdates = pendingUpdates.filter((p) => p[0] !== OldType);
	for (let i = 0; i < pendingUpdates.length; i++) {
		const p = pendingUpdates[i];
		if (p[0] === OldType) {
			pendingUpdates.splice(i, 1);
		}
	}

	vnodes.forEach((vnode, index) => {
		vnode.type = NewType;

		// Class components
		if (vnode._i) {
			vnode._i.constructor = vnode.type;

			if (vnode._i instanceof OldType) {
				const oldInst = vnode._i;
				const newInst = new NewType(vnode.props);
				vnode._i = newInst;

				// Copy all props to new instance
				for (let i in oldInst) {
					const type = typeof oldInst[i];
					if (!(i in newInst)) {
						newInst[i] = oldInst[i];
					} else if (type !== 'function' && typeof newInst[i] === type) {
						if (type === 'object' && newInst[i] != null && newInst[i].constructor === oldInst[i].constructor) {
							Object.assign(newInst[i], oldInst[i]);
						} else {
							newInst[i] = oldInst[i];
						}
					}
				}
			}
		}
		// Functional
		else {
			if (resetHookState) {
				vnode._h = [];
			} else if (vnode._h?.length) {
				vnode._h.forEach((effect) => {
					if (Array.isArray(effect) && effect.length) {
						// Run possible cleanup functions
						if (effect[0] === 'e') {
							if (typeof effect[2] === 'function') {
								effect[2]();
							}
							// Reset hook dependencies so it would run again on next render
							if (Array.isArray(effect[1])) {
								effect[1] = undefined;
							}
						}
					}
				});
			}
		}

		const oldVnode = { ...vnode };

		const newVnode = renderVnode(vnode, oldVnode);

		patchVnodeDom(newVnode, oldVnode);

		vnodes[index] = newVnode;
	});
}

const compareSignatures = (prev, next) => {
	const prevSignature = self.__PREFRESH__.getSignature(prev) || {};
	const nextSignature = self.__PREFRESH__.getSignature(next) || {};

	if (
		prevSignature.key !== nextSignature.key ||
		self.__PREFRESH__.computeKey(prevSignature) !== self.__PREFRESH__.computeKey(nextSignature) ||
		nextSignature.forceReset
	) {
		replaceComponent(prev, next, true);
	} else {
		replaceComponent(prev, next, false);
	}
};

export const flush = () => {
	const pending = [...self.__PREFRESH__.getPendingUpdates()];
	self.__PREFRESH__.flush();

	if (pending.length > 0) {
		pending.forEach(([prev, next]) => {
			compareSignatures(prev, next);
		});
	}
};

export const isComponent = (exportValue) => {
	if (typeof exportValue === 'function') {
		if (exportValue.prototype != null && exportValue.prototype.isReactComponent) {
			return true;
		}

		const name = exportValue.name || exportValue.displayName;
		return typeof name === 'string' && name[0] && name[0] == name[0].toUpperCase();
	}
	return false;
};

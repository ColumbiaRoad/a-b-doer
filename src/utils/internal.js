// Just for smaller bundles. Google Optimize has 20kb limit for JS so every character counts :D
export function domAppend(parent, child) {
	parent.appendChild(child);
}
export function domInsertBefore(parent, child, target) {
	parent.insertBefore(child, target);
}
export function domRemove(parent, child) {
	parent.removeChild(child);
}

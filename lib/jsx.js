const nsElements = [
	'animate',
	'animateMotion',
	'animateTransform',
	'circle',
	'clipPath',
	'defs',
	'desc',
	'discard',
	'ellipse',
	'filter',
	'foreignObject',
	'g',
	'image',
	'line',
	'linearGradient',
	'marker',
	'mask',
	'metadata',
	'mpath',
	'path',
	'pattern',
	'polygon',
	'polyline',
	'radialGradient',
	'rect',
	'set',
	'stop',
	'style',
	'svg',
	'switch',
	'symbol',
	'text',
	'textPath',
	'title',
	'tspan',
	'unknown',
	'use',
	'view',
];

const isNs = (tag) => {
	return nsElements.includes(tag) || /fe[A-Z]/.test(tag);
};

export function createElement(tag, props, ...children) {
	if (typeof tag === 'function') return tag(props, ...children);

	const element = isNs(tag) ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag);

	for (let name in props) {
		if (props.hasOwnProperty(name)) {
			let value = props[name];
			if (name === 'className') {
				name = 'class';
			}
			if (value === false || value === undefined) return;
			if (name.indexOf('on') === 0 && name.toLowerCase() in window)
				element.addEventListener(name.toLowerCase().substr(2), value);
			else element.setAttribute(name, value.toString());
		}
	}

	children.forEach((child) => {
		appendChild(element, child);
	});

	return element;
}

export function appendChild(parent, child) {
	if (Array.isArray(child)) child.forEach((nestedChild) => appendChild(parent, nestedChild));
	else parent.appendChild(child.nodeType ? child : document.createTextNode(child));
}

export function createFragment(props, ...children) {
	return children;
}

Object.assign(jsx, {
	ce: createElement,
	ac: appendChild,
	cf: createFragment,
});

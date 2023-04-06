import { h } from '../../src/jsx';
import { isArray } from '../../src/utils/internal';

// Super simple runtime for pptr toolbar
export const jsx = (type, props, key) => {
	props.key = key;
	const children = isArray(props.children) ? props.children : [props.children];
	return h(type, props, ...children);
};

export const jsxs = jsx;

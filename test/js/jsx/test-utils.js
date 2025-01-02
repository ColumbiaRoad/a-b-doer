import { queryHelpers } from '@testing-library/dom';
import { append } from '../../../src/utils/dom';
import { getVNodeDom, options } from '../../../src/utils/internal';
import { patchVnodeDom, renderVnode } from '../../../internal';

const domVnodeMap = new WeakMap();

const oldVnode = options.vnode;
options.vnode = (vnode) => {
	const domNode = getVNodeDom(vnode, true);
	if (domNode) {
		domVnodeMap.set(domNode, vnode);
	}
	oldVnode(vnode);
};

const oldUnmount = options.unmount;
options.unmount = (vnode) => {
	const domNode = getVNodeDom(vnode, true);
	if (domNode && domVnodeMap.has(domNode)) {
		domVnodeMap.delete(domNode);
	}
	oldUnmount(vnode);
};

export const waitFor = (number) => new Promise((resolve) => setTimeout(resolve, number));

/**
 * @typedef RenderResult
 * @prop {VNode} vnode Rendered VNode
 * @prop {HTMLElement} container Container element where the component was rendered
 * @prop {HTMLElement} element Rendered DOM element
 * @prop {(id: string, options?: any) => HTMLElement | null} getByTestId Get element from rendered container using data-test attribute, throws an error if not present
 * @prop {(id: string, options?: any) => HTMLElement[]} getAllByTestId Get all matching elements from rendered container using data-test attribute, throws an error if not present
 * @prop {(id: string, options?: any) => HTMLElement | null} queryByTestId Get element from rendered container using data-test attribute
 * @prop {(id: string, options?: any) => HTMLElement[ | null]} queryAllByTestId Get all matching elements from rendered container using data-test attribute
 * @prop {(selector: string) => HTMLElement | null} query Run given DOM query to rendered container, returns the first matching element
 * @prop {(selector: string) => HTMLElement[]} queryAll Run given DOM query to rendered container, returns all matching elements
 * @prop {(vnode: VNode) => RenderResult} rerender Rerender the given vnode using previously rendered as an old vnode
 */

/**
 * @param {VNode} vnode
 * @param {HTMLElement} [parentElement]
 * @returns {RenderResult}
 */
export const render = (vnode, parentElement = document.body) => {
	const container = document.createElement('div');
	parentElement.appendChild(container);

	append(vnode, container, false);
	const element = getVNodeDom(vnode, true);
	// Remove data-o attribute so we don't have to put it in every html comparison
	if (element?.dataset) delete element.dataset.o;

	const queryByTestId = queryHelpers.queryByAttribute.bind(null, 'data-test', container);
	const queryAllByTestId = queryHelpers.queryAllByAttribute.bind(null, 'data-test', container);

	function getAllByTestId(id, options) {
		const els = queryAllByTestId(id, options);
		if (!els.length) {
			throw queryHelpers.getElementError(`Unable to find an element by: [data-test="${id}"]`, container);
		}
		return els;
	}

	function getByTestId(id, options) {
		const result = getAllByTestId(id, options);
		if (result.length > 1) {
			throw queryHelpers.getElementError(`Found multiple elements with the [data-test="${id}"]`, container);
		}
		return result[0];
	}

	const sharedProperties = {
		container,
		getByTestId,
		getAllByTestId,
		queryByTestId,
		queryAllByTestId,
		query: (selector) => container.querySelector(selector),
		queryAll: (selector) => container.querySelectorAll(selector),
	};

	const createRerenderer = (oldVnode) => (newVnode) => {
		const renderedVnode = renderVnode(newVnode, oldVnode);
		patchVnodeDom(renderedVnode, oldVnode);
		return {
			...sharedProperties,
			vnode: renderedVnode,
			element: getVNodeDom(renderedVnode, true),
			rerender: createRerenderer(renderedVnode),
		};
	};

	return {
		...sharedProperties,
		vnode,
		element,
		rerender: createRerenderer(vnode),
	};
};

export * from '@testing-library/dom';

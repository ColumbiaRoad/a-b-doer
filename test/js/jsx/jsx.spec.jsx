import { expect, describe, vi, it } from 'vitest';
import { clearAll, unmount } from 'a-b-doer';
import { useState, useEffect } from 'a-b-doer/hooks';
import { Simple, RefHook, Hooks, Switch, OrderApp, Toggles, Loading } from './templates';
import { render } from './test-utils';
import { patchVnodeDom, renderVnode } from '../../../src/utils/render';

describe('JSX', () => {
	vi.useFakeTimers();

	beforeEach(() => {
		clearAll();
	});

	it('should add component styles styles', () => {
		render(<Simple id="tpl1" foo="0" />);
		expect(document.head.innerHTML).toMatch(/body\s*{\s*background:\s*red;\s*}/s);
		expect(document.head.innerHTML).toMatch(/\..*simple.*\s*{\s*background:\s*blue;\s*}/s);
	});

	it('should add proper amount of elements', () => {
		const { container } = render(
			<>
				<Simple id="tpl1" foo="0" />
				<Simple id="tpl2" foo="1" />
				<Simple id="tpl3" foo="2" bar="1" />
			</>
		);
		expect(container.querySelectorAll('.simple').length).toBe(3);
	});

	it('should pass props correctly', () => {
		const { vnode, element } = render(<Simple id="tpl1" foo="0" />);
		expect(vnode.props).toMatchObject({ id: 'tpl1', foo: '0', children: [] });
		expect(element).toContainHTML('"foo":"0"');

		const { vnode: vnode2, element: element2 } = render(<Simple id="tpl2" foo="1" />);
		expect(vnode2.props).toMatchObject({ id: 'tpl2', foo: '1', children: [] });
		expect(element2).toContainHTML('"foo":"1"');

		const { vnode: vnode3, element: element3 } = render(<Simple id="tpl3" foo="2" bar="3" />);
		expect(vnode3.props).toMatchObject({ id: 'tpl3', foo: '2', children: [] });
		expect(element3).toContainHTML('"bar":"3"');
	});

	it('should update sibling styles with ref and hook', () => {
		const { vnode } = render(<RefHook id="tpl4" />);
		const refHook = vnode.__hooks.find((hook) => 'current' in hook).current;
		expect(refHook).toBeTruthy();
		expect(refHook.tagName).toBe('DIV');
		expect(refHook.style.background).toBe('red');
	});

	it('should update parent styles with ref & hook', () => {
		const { query } = render(<Hooks id="tpl5" />);
		const refNode = query('#ref-node');
		expect(refNode).toBeTruthy();
		vi.runAllTimers();
		expect(refNode.style.background).toBe('blue');
		expect(refNode).toContainHTML('<div>Bar</div>');
	});

	it('should call state hook and unmount', () => {
		window.effectCb = false;
		const { container, getByTestId, vnode } = render(<Hooks />);
		expect(container.innerHTML).toMatch(/Val:1/);
		vi.runAllTimers();
		expect(container.innerHTML).toMatch(/Val:2/);
		const clickNode = getByTestId('click-node');
		clickNode.click();
		vi.runAllTimers();
		expect(container.innerHTML).toMatch(/Val:3/);
		unmount(vnode);
		vi.runAllTimers();
		expect(window.effectCb).toBe(true);
	});

	it('should render a terniary child properly', () => {
		const { getByTestId } = render(<Switch />);

		expect(getByTestId('second').tagName).toBe('DIV');
		vi.runAllTimers();
		expect(getByTestId('second').tagName).toBe('P');
		expect(getByTestId('last').previousElementSibling).toBe(getByTestId('second'));
	});

	it('should allow HTMLElement as a VNode type', () => {
		const TestNode = Object.assign(document.createElement('h1'));
		TestNode.dataset.test = 'test-node';
		const { getByTestId } = render(<TestNode />);
		expect(getByTestId('test-node').tagName).toBe('H1');
		expect(getByTestId('test-node').dataset.test).toBe('test-node');
	});

	it('should re-render elements in correct order', () => {
		const { queryByTestId } = render(
			<OrderApp>
				<Simple class="simple-sub" id="tpl9-1" />
				<Simple class="simple-sub" id="tpl9-2" />
				<Simple class="simple-sub" id="tpl9-3" />
			</OrderApp>
		);

		expect(queryByTestId('order')).toBeFalsy();
		vi.runAllTimers();
		const children = queryByTestId('order').children;
		expect(children.length).toBe(3);
		for (let i = 0; i < children.length; i++) {
			expect(children[i].id).toBe(`tpl9-${i + 1}`);
		}
	});

	it('should render conditional children correctly', () => {
		const App = ({ children }) => {
			const [loading, setLoading] = useState(true);
			useEffect(() => {
				setTimeout(() => {
					setLoading(false);
				}, 50);
			}, []);
			if (loading) return <Loading />;
			return (
				<div data-test="app">
					{children}
					<div data-test="bottom-element">Bottom</div>
				</div>
			);
		};

		const Tpl = (props) => {
			return (
				<div data-test="tpl">
					<h3>tpl test {props.test}</h3>
				</div>
			);
		};

		const { queryByTestId, queryAllByTestId } = render(
			<App>
				<Tpl test="1" />
				<Tpl test="2" />
				<Tpl test="3" />
			</App>
		);
		expect(queryByTestId('app')).toBeFalsy();
		expect(queryByTestId('loading')).toBeTruthy();
		vi.runAllTimers();

		const children = queryByTestId('app').children;
		expect(children.length).toBe(4);

		const tpl = queryAllByTestId('tpl');
		expect(tpl.length).toBe(3);

		const bottom = queryByTestId('bottom-element');
		expect(children[3]).toBe(bottom);

		for (let i = 0; i < 3; i++) {
			expect(children[i].innerHTML).toBe(`<h3>tpl test ${i + 1}</h3>`);
		}
	});

	it('should render correctly mapped array children', () => {
		const { queryByTestId } = render(
			<div data-test="container">
				{[0, 1, 2].map((i) => (
					<div key={`i${i}`} data-test="item" id={`item${i}`}>
						Item {i}
					</div>
				))}
				<div data-test="bottom-element">Bottom</div>
			</div>
		);

		const container = queryByTestId('container');
		expect(container.children.length).toBe(4);
		const bottom = queryByTestId('bottom-element');
		expect(container.lastChild).toBe(bottom);

		for (let i = 0; i < container.children.length - 1; i++) {
			expect(container.children[i].id).toBe(`item${i}`);
		}
	});

	it('should render correctly mapped array children with fragments', () => {
		const FragComponent = ({ children }) => (
			<>
				<>
					<div data-test="row">Some element</div>
					<div data-test="row">{children}</div>
				</>
			</>
		);

		const FragComponent2 = ({ children }) => (
			<>
				<div data-test="subrow">Some other element</div>
				<div data-test="subrow">{children}</div>
			</>
		);

		const { queryByTestId, queryAllByTestId } = render(
			<div data-test="container">
				{[0, 1, 2].map((i) => (
					<FragComponent key={`i${i}`}>
						<FragComponent2>Item {i}</FragComponent2>
					</FragComponent>
				))}
				<div data-test="bottom-element">Bottom</div>
			</div>
		);

		const container = queryByTestId('container');
		expect(container.children.length).toBe(7);
		const bottom = queryByTestId('bottom-element');
		expect(container.lastChild).toBe(bottom);
		const rows = queryAllByTestId('row');

		for (let i = 0; i < container.children.length - 1; i++) {
			expect(container.children[i]).toBe(rows[i]);
		}
	});

	it('should patch correctly if vnode type changes', () => {
		const container = document.createElement('div');
		const vnode = renderVnode(
			<div>
				<h1>Testing</h1>
			</div>
		);
		container.append(vnode.__dom);
		patchVnodeDom(vnode, null);
		expect(container.innerHTML).toBe('<div><h1>Testing</h1></div>');
		const vnode2 = renderVnode(
			<div>
				<h4>Testing</h4>
			</div>,
			vnode
		);
		patchVnodeDom(vnode2, vnode);
		expect(container.innerHTML).toBe('<div><h4>Testing</h4></div>');
	});

	it('should render looped children correctly after render', () => {
		const { queryByTestId, queryAllByTestId } = render(<Toggles id="toggles-id" />);

		expect(queryByTestId('toggles')).not.toBeFalsy();
		expect(queryByTestId('toggles-fragment')).not.toBeFalsy();
		expect(queryAllByTestId('toggle').length).toBe(4);
		vi.runAllTimers();
		const toggles = queryAllByTestId('toggle');
		for (const toggle of toggles) {
			expect(toggle.childNodes[0].tagName).toBe('INPUT');
			expect(toggle.childNodes[1].tagName).toBe('SPAN');
			expect(toggle.childNodes[2].nodeType).toBe(3);
		}
	});
});

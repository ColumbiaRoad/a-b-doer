import { expect, describe, vi, it } from 'vitest';
import { clearAll, unmount } from 'a-b-doer';
import { useState, useEffect } from 'a-b-doer/hooks';
import { Simple, RefHook, Hooks, Switch, OrderApp } from './templates';
import { render } from './test-utils';

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
		// 	await expect(t).toMatch(`"foo":"${tpl.indexOf(t)}"`);
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

	it('should re-render elements in correct order', async () => {
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

	it('should render conditional children correctly', async () => {
		const App = ({ children }) => {
			const [loading, setLoading] = useState(true);
			useEffect(() => {
				setTimeout(() => {
					setLoading(false);
				}, 50);
			}, []);
			if (loading) return <div data-test="loading">Loading</div>;
			return <div data-test="app">{children}</div>;
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
		expect(queryByTestId('app')).toBeTruthy();

		const children = queryByTestId('app').children;
		expect(children.length).toBe(3);

		const tpl = queryAllByTestId('tpl');
		expect(tpl.length).toBe(3);

		for (let i = 0; i < children.length; i++) {
			expect(children[i].innerHTML).toBe(`<h3>tpl test ${i + 1}</h3>`);
		}
	});
});

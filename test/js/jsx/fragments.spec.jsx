import { expect, describe, vi, it, beforeEach } from 'vitest';
import { clearAll } from 'a-b-doer';
import { Simple } from './templates';
import { render } from './test-utils';

describe('JSX: Fragments', () => {
	vi.useFakeTimers();

	beforeEach(() => {
		clearAll();
	});

	const CommonFragComponent = ({ children }) => (
		<>
			<div data-test="subrow">Some other element</div>
			<div data-test="subrow">{children}</div>
		</>
	);

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

	it('should render correctly mapped array children with fragments', () => {
		const FragComponent = ({ children }) => (
			<>
				<>
					<div data-test="row">Some element</div>
					<div data-test="row">{children}</div>
				</>
			</>
		);

		const { queryByTestId, queryAllByTestId } = render(
			<div data-test="container">
				{[0, 1, 2].map((i) => (
					<FragComponent key={`i${i}`}>
						<CommonFragComponent>Item {i}</CommonFragComponent>
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

	it('should patch correctly vnode with fragments', () => {
		let renderResult = render(
			<div>
				<h1>Testing</h1>
			</div>
		);
		expect(renderResult.container.innerHTML).toBe('<div><h1>Testing</h1></div>');

		renderResult = renderResult.rerender(
			<div>
				Text
				<>
					<div>row1</div>
					<div>row2</div>
				</>
				<h1>Testing</h1>
			</div>
		);
		expect(renderResult.container.innerHTML).toBe('<div>Text<div>row1</div><div>row2</div><h1>Testing</h1></div>');

		renderResult = renderResult.rerender(
			<div>
				Text
				<h2>Testing</h2>
			</div>
		);
		expect(renderResult.container.innerHTML).toBe('<div>Text<h2>Testing</h2></div>');

		renderResult = renderResult.rerender(
			<div>
				<>
					<div>row1</div>
					<>
						<div>row2</div>
						<div>row3</div>
					</>
				</>
				Text
				<h2>Testing</h2>
			</div>
		);
		expect(renderResult.container.innerHTML).toBe(
			'<div><div>row1</div><div>row2</div><div>row3</div>Text<h2>Testing</h2></div>'
		);
	});

	it('should patch correctly vnode with fragments, case rerender', () => {
		let renderResult = render(
			<div>
				<label>
					<input type="checkbox" />
					Checkbox
				</label>
				<div>
					<div>foo1</div>
					<div>foo2</div>
				</div>
			</div>
		);
		expect(renderResult.container.innerHTML).toBe(
			'<div><label><input type="checkbox">Checkbox</label><div><div>foo1</div><div>foo2</div></div></div>'
		);

		renderResult = renderResult.rerender(
			<div>
				<>
					<div>First</div>
					<div>FOO</div>
					<div>BAR</div>
					<>
						<div>FOO2</div>
						<div>BAR2</div>
						<div>BAZ2</div>
					</>
					<div>BAZ</div>
				</>
				<label>
					<input type="checkbox" />
					Checkbox
				</label>
				<div>
					<div>foo1</div>
					<div>foo2</div>
				</div>
			</div>
		);
		expect(renderResult.container.innerHTML).toBe(
			'<div><div>First</div><div>FOO</div><div>BAR</div><div>FOO2</div><div>BAR2</div><div>BAZ2</div><div>BAZ</div><label><input type="checkbox">Checkbox</label><div><div>foo1</div><div>foo2</div></div></div>'
		);

		const vnode3 = { ...renderResult.vnode };
		renderResult = renderResult.rerender(vnode3);
		expect(renderResult.container.innerHTML).toBe(
			'<div><div>First</div><div>FOO</div><div>BAR</div><div>FOO2</div><div>BAR2</div><div>BAZ2</div><div>BAZ</div><label><input type="checkbox">Checkbox</label><div><div>foo1</div><div>foo2</div></div></div>'
		);

		renderResult = renderResult.rerender(
			<div>
				<label>
					<input type="checkbox" />
					Checkbox
				</label>
				<div>
					<div>foo1</div>
					<div>foo2</div>
				</div>
			</div>
		);
		expect(renderResult.container.innerHTML).toBe(
			'<div><label><input type="checkbox">Checkbox</label><div><div>foo1</div><div>foo2</div></div></div>'
		);
	});

	it('should patch correctly custom component with fragments as children', () => {
		let renderResult = render(
			<div>
				Text
				<CommonFragComponent>Foo</CommonFragComponent>
			</div>
		);
		expect(renderResult.container.innerHTML).toBe(
			'<div>Text<div data-test="subrow">Some other element</div><div data-test="subrow">Foo</div></div>'
		);

		renderResult = renderResult.rerender(
			<div>
				Text
				<CommonFragComponent>
					<h1>Bar</h1>Foo
				</CommonFragComponent>
			</div>
		);
		expect(renderResult.container.innerHTML).toBe(
			'<div>Text<div data-test="subrow">Some other element</div><div data-test="subrow"><h1>Bar</h1>Foo</div></div>'
		);

		renderResult = renderResult.rerender(
			<div>
				Text
				<CommonFragComponent>
					<h1>Bar</h1>Foo
				</CommonFragComponent>
				TextBelow
			</div>
		);
		expect(renderResult.container.innerHTML).toBe(
			'<div>Text<div data-test="subrow">Some other element</div><div data-test="subrow"><h1>Bar</h1>Foo</div>TextBelow</div>'
		);

		renderResult = renderResult.rerender(
			<div>
				Text
				<CommonFragComponent>
					<h1>Bar</h1>Foo
					<CommonFragComponent>
						<h2>Sub2</h2>Foo2
					</CommonFragComponent>
				</CommonFragComponent>
				TextBelow
			</div>
		);
		expect(renderResult.container.innerHTML).toBe(
			'<div>Text<div data-test="subrow">Some other element</div><div data-test="subrow"><h1>Bar</h1>Foo<div data-test="subrow">Some other element</div><div data-test="subrow"><h2>Sub2</h2>Foo2</div></div>TextBelow</div>'
		);
	});
});

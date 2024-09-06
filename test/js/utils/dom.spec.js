import {
	append,
	// clear,
	insertBefore,
	insertAfter,
	prepend,
	// pollQuerySelector,
	// pollQuerySelectorAll,
	waitFor,
	// waitElement,
	// waitElements,
	setDefaultTimeout,
} from 'a-b-doer';
import { expect, describe, it } from 'vitest';

describe('DOM', () => {
	/** @type HTMLElement */
	let container;
	/** @type HTMLElement */
	let wrapper;

	beforeAll(() => {
		container = document.createElement('div');
		document.body.append(container);
	});

	afterAll(() => {
		document.body.remove(container);
	});

	beforeEach(() => {
		wrapper = createElement();
	});

	afterEach(() => {
		wrapper.remove();
	});

	const createElement = () => {
		const div = document.createElement('div');
		div.dataset.test = 'test-node';
		container.append(div);
		return div;
	};

	it('should append div to body', () => {
		const div = document.createElement('div');
		div.id = 'foo1';
		div.innerText = 'bar1';
		append(div, wrapper);
		expect(container).toContainElement(div);
		expect(div).toHaveAttribute('data-o', process.env.TEST_ID);
	});

	it('should prepend div to body', async () => {
		const h1 = document.createElement('h1');
		wrapper.append(h1);
		const div = document.createElement('div');
		div.id = 'foo2';
		div.innerHTML = 'bar2';
		prepend(div, wrapper);
		expect(h1.previousElementSibling).toHaveAttribute('id', 'foo2');
		expect(h1.previousElementSibling.innerHTML).toMatch(`bar2`);
		expect(h1.previousElementSibling).toHaveAttribute('data-o', process.env.TEST_ID);
	});

	it('should create div before given element', async () => {
		wrapper.append(document.createElement('h2'));
		const h1 = document.createElement('h1');
		wrapper.append(h1);
		const div = document.createElement('div');
		div.id = 'foo3';
		div.innerHTML = 'bar3';
		insertBefore(div, h1);
		expect(h1.previousElementSibling).toHaveAttribute('id', 'foo3');
		expect(h1.previousElementSibling.innerHTML).toMatch(`bar3`);
		expect(h1.previousElementSibling).toHaveAttribute('data-o', process.env.TEST_ID);
		expect(h1.previousElementSibling.previousElementSibling.tagName).toBe('H2');
	});

	it('should create div after given element', async () => {
		const h1 = document.createElement('h1');
		wrapper.append(h1);
		wrapper.append(document.createElement('h2'));

		const div = document.createElement('div');
		div.id = 'foo4';
		div.innerHTML = 'bar4';
		insertAfter(div, h1);

		expect(h1.nextElementSibling).toHaveAttribute('id', 'foo4');
		expect(h1.nextElementSibling.innerHTML).toMatch(`bar4`);
		expect(h1.nextElementSibling).toHaveAttribute('data-o', process.env.TEST_ID);
		expect(h1.nextElementSibling.nextElementSibling.tagName).toBe('H2');
	});

	it('should change polling timeout', async () => {
		setDefaultTimeout(100);

		window.__timeoutRes = [];

		let t = Date.now();
		waitFor(() => {
			return undefined;
		}).then(() => {
			window.__timeoutRes.push(Date.now() - t);
		});

		t = Date.now();
		waitFor(() => {
			return undefined;
		}).then(() => {
			window.__timeoutRes.push(Date.now() - t);
		});

		await (() => new Promise((resolve) => setTimeout(resolve, 250)))();

		const [first, second] = window.__timeoutRes;

		expect(first).toBeGreaterThan(100);
		// Allow some milliseconds for value fetching
		expect(first).toBeLessThan(200);

		expect(second).toBeGreaterThan(100);
		// Allow some milliseconds for value fetching
		expect(second).toBeLessThan(200);
	});
});

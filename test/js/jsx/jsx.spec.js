import { bundler, openPage } from '../../../lib/bundler';
import path from 'path';
import { fileURLToPath } from 'url';

jest.setTimeout(20000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const config = { ...global.configDefaults, testPath: __dirname };

describe('JSX', () => {
	let page, content, tpl;

	beforeAll(async () => {
		const output = await bundler({ ...config, entry: './index.jsx' });
		page = await openPage(output);
		await page.waitForTimeout(50);
		content = await page.content();
		tpl = await page.$$('.simple');
	});

	it('should add test styles', () => {
		expect(content).toMatch(/<style data-id="[\w-_]+">body{background:red}<\/style>/);
	});

	it('should add proper amount of elements', (done) => {
		expect(tpl.length).toBe(3);
		done();
	});

	it('should pass props correctly', async () => {
		for (const t of tpl) {
			await expect(t).toMatch(`"foo":"${tpl.indexOf(t)}"`);
		}
	});

	it('should update sibling styles with ref', async () => {
		const node = await page.$('#tpl4');
		await expect(node).toMatchElement('[style*="background: red"]');
		await expect(node).toMatch('Foo');
	});

	it('should update parent styles with ref & hook', async () => {
		const node = await page.$('#tpl5');
		await expect(node).toMatchElement('[style*="background: blue"]');
		await expect(node).toMatch('Bar');
	});

	it('should call state hook and unmount', async () => {
		await page.evaluate(() => {
			window.effectCb = false;
		});
		const node = await page.$('#tpl6');
		await expect(node).toMatch(/Val:2/);
		await page.click('#tpl6click');
		await expect(node).toMatch(/Val:3/);
		await page.evaluate(() => {
			window.unmount(window.hookVnode);
		});
		const cbCalled = await page.evaluate(() => window.effectCb);
		expect(cbCalled).toBe(true);
	});

	it('should render a terniary child properly', async () => {
		const node = await page.$('#tpl7');
		await expect(node).toMatchElement('p');
		await expect(node).toMatch(/First\s*ValP:1\s*Last/ms);
	});

	it('should allow HTMLElement as a VNode type', async () => {
		const node = await page.$('#tpl8');
		await expect(node).toMatch('Example Domain');
		await expect(page).toMatchElement('[data-o="h1"]');
	});

	it('should re-render elements in correct order', async () => {
		const node = await page.$('#tpl9');
		const children = await node.$$('.simple-sub');
		let i = 1;
		for (const child of children) {
			const id = await child.evaluate((element) => element.id);
			expect(id).toBe('tpl9-' + i);
			i++;
		}
	});
});

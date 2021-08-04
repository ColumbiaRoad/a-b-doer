const { bundler, openPage } = require('../../../dist/lib/bundler');

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
		expect(content).toMatch(`<style>body{background:red}</style>`);
	});

	it('should add proper amount of elements', (done) => {
		expect(tpl.length).toBe(3);
		done();
	});

	it('should pass props correctly', async () => {
		for (const t of tpl) {
			const html = await (await t.getProperty('innerHTML')).jsonValue();
			expect(html).toMatch(`"foo":"${tpl.indexOf(t)}"`);
		}
	});

	it('should update sibling styles with ref', async () => {
		const node = await page.$('#tpl4');
		const html = await (await node.getProperty('innerHTML')).jsonValue();
		expect(html).toMatch(/background:\s*red/);
		expect(html).toMatch('Foo');
	});

	it('should update parent styles with ref & hook', async () => {
		const node = await page.$('#tpl5');
		const html = await (await node.getProperty('outerHTML')).jsonValue();
		expect(html).toMatch(/background:\s*blue/);
		expect(html).toMatch('Bar');
	});
});

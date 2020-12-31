const { bundler, openPage } = require('../../../lib/bundler');

const config = { ...global.configDefaults, testPath: __dirname };

describe('JSX', () => {
	let page, content, tpl;

	beforeAll(async () => {
		const output = await bundler({ ...config, entry: './index.jsx' });
		page = await openPage(output);
		await page.waitForTimeout(500);
		content = await page.content();
		tpl = await page.$$('.tpl');
	});

	test('should add test styles', () => {
		expect(content).toMatch(`<style>body{background:red}</style>`);
	});

	test('should add proper amount of elements', async (done) => {
		expect(tpl.length).toBe(3);
		done();
	});

	test('should pass props correctly', async (done) => {
		for (const t of tpl) {
			const html = await (await t.getProperty('innerHTML')).jsonValue();
			expect(html).toMatch(`"foo":"${tpl.indexOf(t)}"`);
		}
		done();
	});
});

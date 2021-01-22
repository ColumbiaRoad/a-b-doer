const { bundler, openPage } = require('../../../dist/lib/bundler');

const config = { ...global.configDefaults, testPath: __dirname };

describe('DOM', () => {
	let page;

	beforeAll(async () => {
		const output = await bundler({ ...config, entry: './index.js' });
		page = await openPage(output);
	});

	it('should append div to body', async () => {
		const content = await page.evaluate(() => {
			const div = document.createElement('div');
			div.id = 'foo123';
			div.innerText = 'bar123';
			utilFns['append'](div, document.body);
			return document.body.innerHTML;
		});
		expect(content).toMatch(`id="foo123"`);
		expect(content).toMatch(`bar123`);
		expect(content).toMatch(`data-o="t-`);
	});

	it('should prepend div to body', async () => {
		await page.evaluate(() => {
			const div = document.createElement('div');
			div.id = 'foo123';
			div.innerText = 'bar123';
			utilFns['prepend'](div, document.querySelector('h1').parentNode);
			return document.body.innerHTML;
		});

		const content = await page.$eval('h1', (h1) => h1.previousElementSibling.outerHTML);

		expect(content).toMatch(`id="foo123"`);
		expect(content).toMatch(`bar123`);
		expect(content).toMatch(`data-o="t-`);
	});

	it('should create div before given element', async () => {
		await page.evaluate(() => {
			const div = document.createElement('div');
			div.id = 'foo123';
			div.innerText = 'bar123';
			utilFns['insertBefore'](div, document.querySelector('h1'));
			return document.body.innerHTML;
		});

		const content = await page.$eval('h1', (h1) => h1.previousElementSibling.outerHTML);

		expect(content).toMatch(`id="foo123"`);
		expect(content).toMatch(`bar123`);
		expect(content).toMatch(`data-o="t-`);
	});
});

const { bundler, openPage } = require('../../../lib/bundler');

const config = { ...global.configDefaults, testPath: __dirname };

describe('EJS', () => {
	let page, content, ejs, html;

	beforeAll(async () => {
		const output = await bundler({ ...config, entry: './index.js' });
		page = await openPage(output);
		await page.waitForTimeout(50);
		content = await page.content();
		ejs = await page.$('#ejs');
		html = await page.$('#html');
	});

	test('should add test styles', () => {
		expect(content).toMatch(`<style>body{background:red}</style>`);
	});

	test('should add ejs file content', async (done) => {
		expect(ejs).toBeTruthy();
		expect(await (await ejs.getProperty('innerHTML')).jsonValue()).toMatch('<h3>text 1</h3>');
		done();
	});

	test('should add html file content', async (done) => {
		expect(html).toBeTruthy();
		expect(await (await html.getProperty('innerHTML')).jsonValue()).toMatch('<h3>text 2</h3>');
		done();
	});
});

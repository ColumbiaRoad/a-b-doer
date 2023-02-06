import { jest } from '@jest/globals';
import { bundler, openPage } from '../../../lib/bundler';
import path from 'path';
import { fileURLToPath } from 'url';

jest.setTimeout(20000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const config = { ...global.configDefaults, testPath: __dirname };

describe('DOM', () => {
	let page;

	beforeAll(async () => {
		const output = await bundler({ ...config, entry: './index.js' });
		page = await openPage(output);
	});

	it('should append div to body', async () => {
		const content = await page.evaluate(() => {
			const { append } = utilFns;
			const div = document.createElement('div');
			div.id = 'foo123';
			div.innerText = 'bar123';
			append(div, document.body);
			return document.body.innerHTML;
		});
		expect(content).toMatch(`id="foo123"`);
		expect(content).toMatch(`bar123`);
		expect(content).toMatch(`data-o="${process.env.TEST_ID}`);
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
		expect(content).toMatch(`data-o="${process.env.TEST_ID}`);
	});

	it('should create div before given element', async () => {
		await page.evaluate(() => {
			const { insertBefore } = utilFns;
			const div = document.createElement('div');
			div.id = 'foo123';
			div.innerText = 'bar123';
			insertBefore(div, document.querySelector('h1'));
			return document.body.innerHTML;
		});

		const content = await page.$eval('h1', (h1) => h1.previousElementSibling.outerHTML);

		expect(content).toMatch(`id="foo123"`);
		expect(content).toMatch(`bar123`);
		expect(content).toMatch(`data-o="${process.env.TEST_ID}`);
	});

	it('should create div after given element', async () => {
		await page.evaluate(() => {
			const { insertAfter } = utilFns;
			const div = document.createElement('div');
			div.id = 'foo123';
			div.innerText = 'bar123';
			insertAfter(div, document.querySelector('h1'));
			return document.body.innerHTML;
		});

		const content = await page.$eval('h1', (h1) => h1.nextElementSibling.outerHTML);

		expect(content).toMatch(`id="foo123"`);
		expect(content).toMatch(`bar123`);
		expect(content).toMatch(`data-o="${process.env.TEST_ID}`);
	});

	it('should change polling timeout', async () => {
		await page.evaluate(() => {
			const { setDefaultTimeout, waitFor } = utilFns;
			setDefaultTimeout(200);

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
		});

		await page.waitForTimeout(500);

		const res = await page.evaluate(() => window.__timeoutRes);
		const [first, second] = res;

		expect(first).toBeGreaterThan(200);
		// Allow some milliseconds for value fetching
		expect(first).toBeLessThan(300);

		expect(second).toBeGreaterThan(200);
		// Allow some milliseconds for value fetching
		expect(second).toBeLessThan(300);
	});
});

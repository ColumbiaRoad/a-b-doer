import { jest } from '@jest/globals';
import { bundler, openPage } from '../../lib/bundler';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

jest.setTimeout(20000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const config = { ...global.configDefaults, testPath: __dirname };

describe('Configuration options', () => {
	let page;

	it('should create chunked output', async () => {
		const output = await bundler({
			...config,
			chunks: true,
			entry: './chunks.jsx',
			// Simulate manual adding of main chunk import
			onBefore: async (page) => {
				page.setRequestInterception(true);
				page.on('request', (req) => {
					const url = req.url();
					if (url.includes('http://localhost/')) {
						const urlPath = url.replace('http://localhost/', '');
						req.respond({
							body: fs.readFileSync(path.resolve(__dirname, '.build', urlPath)),
							// Allow cross domain requests to "localhost", current domain is data url
							headers: {
								'Access-Control-Allow-Origin': '*',
							},
							contentType: 'application/javascript',
						});
					} else {
						req.continue();
					}
				});
				page.on('domcontentloaded', async () => {
					const systemJS = fs.readFileSync(path.resolve(__dirname, 's.min.js')).toString();
					await page.addScriptTag({ content: systemJS });
					setTimeout(async () => {
						// Use localhost domain for chunks because current url is data url (see setup.js) and domain would be invalid for chunks
						await page.addScriptTag({
							content: `
							System.constructor.prototype.resolve = function (id) {
								return \`http://localhost/\${id.replace('./', '')}\`;
							};
							System.import("./chunks.js");
							`,
						});
					}, 100);
				});
			},
		});
		page = await openPage(output);
		await expect(page).toMatchElement('#chunks');
		const content = await page.content();
		expect(content).toMatch(/Val:[\d]/);
		expect(content).toMatch(`<div>Bar</div>`);
		expect(content).toMatch(`data-o="t-`);

		const files = fs.readdirSync(path.resolve(__dirname, '.build'));
		expect(files.length).toBe(4);
		expect(files).toContain('chunks.bundle.js');
		expect(files).toContain('chunks.css');
		expect(files).toContain('chunks.js');
		expect(files.some((val) => /^templates-[a-z0-9]+\.js$/.test(val))).toBeTruthy();
	});

	it('should use preact', async () => {
		const output = await bundler({ ...config, preact: true, entry: './preact.jsx' });
		page = await openPage(output);
		await expect(page).toMatchElement('#preact');
		const content = await page.content();
		expect(content).toMatch(/ValPreact:[\d]/);
		expect(content).toMatch(`<div>BarPreact</div>`);
		expect(content).toMatch(`data-o="t-`);
	});

	it('should disable css modules', async () => {
		const output = await bundler({ ...config, modules: false, entry: './index.jsx' });
		page = await openPage(output);
		await expect(page).toMatchElement('#tpl');
		const content = await page.content();
		expect(content).toMatch(/<style[^>]*>body{background:(red|#f00)}\.content{background:(blue|#00f)}/);
		expect(content).toMatch(/simple content/);
		const bg = await page.evaluate(() => {
			const element = document.querySelector('.content');
			return window.getComputedStyle(element).getPropertyValue('background-color');
		});
		await expect(bg).toMatch(/rgb\(0,\s*0,\s*255\)/);
	});

	it('should not append styles', async () => {
		const output = await bundler({ ...config, modules: false, appendStyles: false, entry: './index.jsx' });
		page = await openPage(output);
		await expect(page).toMatchElement('#tpl');
		const content = await page.content();
		expect(content).not.toMatch(/<style[^>]*>body{background:(red|#f00)}\.content{background:(blue|#00f)}/);
		expect(content).toMatch(/simple content/);
		const bg = await page.evaluate(() => {
			const element = document.querySelector('.content');
			return window.getComputedStyle(element).getPropertyValue('background-color');
		});
		await expect(bg).toMatch(/rgb\(253,\s*253,\s*255\)/);
	});

	it('should not activate the test without dataLayer event when activationEvent is set', async () => {
		const output = await bundler({ ...config, activationEvent: 'activate.test', entry: './index.jsx' });
		page = await openPage(output);
		await expect(page).not.toMatchElement('#tpl');
		await page.evaluate(() => {
			window.dataLayer = window.dataLayer || [];
			window.dataLayer.push({ event: 'activate.test' });
		});
		await expect(page).toMatchElement('#tpl', { timeout: 2000 });
		const content = await page.content();
		expect(content).not.toMatch(/<style[^>]*>body{background:(red|#f00)}\.content{background:(blue|#00f)}/);
		expect(content).toMatch(/simple content/);
	});
});

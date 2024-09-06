import { bundler, openPage } from '../../lib/bundler';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { expect, describe, it } from 'vitest';
import { config as defaultConfig } from '../../lib/buildspec';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..', '..');

const config = {
	...defaultConfig,
	testPath: __dirname,
	getBundlerConfig(opts) {
		return {
			...opts,
			logLevel: 'error',
			build: {
				...opts.build,
				reportCompressedSize: false,
				chunkSizeWarningLimit: false,
			},
			resolve: {
				alias: [
					{ find: 'a-b-doer/hooks', replacement: path.join(rootDir, 'hooks') },
					{ find: 'a-b-doer', replacement: path.join(rootDir, 'main') },
				],
			},
		};
	},
};

const puppeteerConfig = {
	...defaultConfig,
	browser: process.env.BROWSER_PATH,
	headless: true,
	url: [
		// example.com as data url
		'data:text/html;charset=utf-8;base64,PCFkb2N0eXBlIGh0bWw+DQo8aHRtbD4NCjxoZWFkPg0KICAgIDx0aXRsZT5FeGFtcGxlIERvbWFpbjwvdGl0bGU+DQoNCiAgICA8bWV0YSBjaGFyc2V0PSJ1dGYtOCIgLz4NCiAgICA8bWV0YSBodHRwLWVxdWl2PSJDb250ZW50LXR5cGUiIGNvbnRlbnQ9InRleHQvaHRtbDsgY2hhcnNldD11dGYtOCIgLz4NCiAgICA8bWV0YSBuYW1lPSJ2aWV3cG9ydCIgY29udGVudD0id2lkdGg9ZGV2aWNlLXdpZHRoLCBpbml0aWFsLXNjYWxlPTEiIC8+DQogICAgPHN0eWxlIHR5cGU9InRleHQvY3NzIj4NCiAgICBib2R5IHsNCiAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogI2YwZjBmMjsNCiAgICAgICAgbWFyZ2luOiAwOw0KICAgICAgICBwYWRkaW5nOiAwOw0KICAgICAgICBmb250LWZhbWlseTogLWFwcGxlLXN5c3RlbSwgc3lzdGVtLXVpLCBCbGlua01hY1N5c3RlbUZvbnQsICJTZWdvZSBVSSIsICJPcGVuIFNhbnMiLCAiSGVsdmV0aWNhIE5ldWUiLCBIZWx2ZXRpY2EsIEFyaWFsLCBzYW5zLXNlcmlmOw0KICAgICAgICANCiAgICB9DQogICAgZGl2IHsNCiAgICAgICAgd2lkdGg6IDYwMHB4Ow0KICAgICAgICBtYXJnaW46IDVlbSBhdXRvOw0KICAgICAgICBwYWRkaW5nOiAyZW07DQogICAgICAgIGJhY2tncm91bmQtY29sb3I6ICNmZGZkZmY7DQogICAgICAgIGJvcmRlci1yYWRpdXM6IDAuNWVtOw0KICAgICAgICBib3gtc2hhZG93OiAycHggM3B4IDdweCAycHggcmdiYSgwLDAsMCwwLjAyKTsNCiAgICB9DQogICAgYTpsaW5rLCBhOnZpc2l0ZWQgew0KICAgICAgICBjb2xvcjogIzM4NDg4ZjsNCiAgICAgICAgdGV4dC1kZWNvcmF0aW9uOiBub25lOw0KICAgIH0NCiAgICBAbWVkaWEgKG1heC13aWR0aDogNzAwcHgpIHsNCiAgICAgICAgZGl2IHsNCiAgICAgICAgICAgIG1hcmdpbjogMCBhdXRvOw0KICAgICAgICAgICAgd2lkdGg6IGF1dG87DQogICAgICAgIH0NCiAgICB9DQogICAgPC9zdHlsZT4gICAgDQo8L2hlYWQ+DQoNCjxib2R5Pg0KPGRpdj4NCiAgICA8aDE+RXhhbXBsZSBEb21haW48L2gxPg0KICAgIDxwPlRoaXMgZG9tYWluIGlzIGZvciB1c2UgaW4gaWxsdXN0cmF0aXZlIGV4YW1wbGVzIGluIGRvY3VtZW50cy4gWW91IG1heSB1c2UgdGhpcw0KICAgIGRvbWFpbiBpbiBsaXRlcmF0dXJlIHdpdGhvdXQgcHJpb3IgY29vcmRpbmF0aW9uIG9yIGFza2luZyBmb3IgcGVybWlzc2lvbi48L3A+DQogICAgPHA+PGEgaHJlZj0iaHR0cHM6Ly93d3cuaWFuYS5vcmcvZG9tYWlucy9leGFtcGxlIj5Nb3JlIGluZm9ybWF0aW9uLi4uPC9hPjwvcD4NCjwvZGl2Pg0KPC9ib2R5Pg0KPC9odG1sPg==',
	],
	assetBundle: {
		js: true,
		bundle: '',
	},
};

describe('Configuration options', () => {
	let page;

	const getPuppeteerConfig = (bundle) => {
		return { ...puppeteerConfig, assetBundle: { ...puppeteerConfig.assetBundle, ...bundle.assetBundle } };
	};

	it('should create chunked output', async () => {
		await bundler({
			...config,
			chunks: true,
			entry: './chunks.jsx',
		});
		page = await openPage(
			{
				...puppeteerConfig,
				assetBundle: {
					...puppeteerConfig.assetBundle,
					bundle: 'import "http://localhost/chunks.js"',
				},
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
				},
			},
			false
		);
		const element = await page.$('#chunks');
		expect(element).toBeTruthy();
		const content = await page.content();
		expect(content).toMatch(/Val:[\d]/);
		expect(content).toMatch(`<div>Bar</div>`);
		expect(content).toMatch(`data-o="t-`);

		const files = fs.readdirSync(path.resolve(__dirname, '.build'));
		expect(files).toContain('chunks.js');
		expect(files.some((val) => /^templates-[a-z0-9]+\.js$/i.test(val))).toBeTruthy();
	});

	it('should use preact', async () => {
		const output = await bundler({ ...config, preact: true, entry: './preact.jsx' });
		page = await openPage(getPuppeteerConfig(output));
		const element = await page.$('#preact');
		const content = await page.content();
		expect(element).toBeTruthy();
		expect(content).toMatch(/ValPreact:[\d]/);
		expect(content).toMatch(`<div>BarPreact</div>`);
		expect(content).toMatch(`data-o="t-`);
	});

	describe('Activation', () => {
		it('should not activate the test without dataLayer event when activationEvent is set', async () => {
			const output = await bundler({ ...config, entry: './index.jsx' });
			page = await openPage({ ...getPuppeteerConfig(output), activationEvent: 'activate.test' });
			const element = await page.$('#tpl');
			expect(element).not.toBeTruthy();
			await page.evaluate(() => {
				window.dataLayer = window.dataLayer || [];
				window.dataLayer.push({ event: 'activate.test' });
			});
			const element2 = await page.$('#tpl');
			expect(element2).toBeTruthy();
			const content = await page.content();
			expect(content).toMatch(/<style[^>]*>body{background:(red|#f00)}\.\w+-content{background:(blue|#00f)}/);
			expect(content).toMatch(/simple content/);
		});

		it('should listen history changes for activation', async () => {
			const output = await bundler({ ...config, entry: './index.jsx' });
			const pptrConfig = getPuppeteerConfig(output);
			const url = pptrConfig.url[0];
			pptrConfig.url = ['about:blank', `${url}#test`];
			page = await openPage({ ...pptrConfig, historyChanges: true, testHistoryChanges: true });
			const element = await page.$('#tpl');
			expect(element).not.toBeTruthy();
			await page.goto(url);
			await page.evaluate((url) => {
				window.history.pushState({}, '', `${url}#test`);
				window.history.pushState({}, '', `${url}#ignored`);
			}, url);
			await page.goBack();
			const element2 = await page.$('#tpl');
			expect(element2).toBeTruthy();
			const content = await page.content();
			expect(content).toMatch(/<style[^>]*>body{background:(red|#f00)}\.\w+-content{background:(blue|#00f)}/);
			expect(content).toMatch(/simple content/);
			page.off('domcontentloaded', page.__loadListener);
		});

		it('should not listen history changes for activation', async () => {
			const output = await bundler({ ...config, entry: './index.jsx' });
			const pptrConfig = getPuppeteerConfig(output);
			const url = pptrConfig.url[0];
			pptrConfig.url = ['about:blank', `${url}#test2`];
			page = await openPage({ ...pptrConfig, historyChanges: false });
			const element = await page.$('#tpl');
			expect(element).not.toBeTruthy();
			await page.goto(url);
			await page.evaluate((url) => {
				window.history.pushState({}, undefined, `${url}#test2`);
				window.history.pushState({}, '', `${url}#ignored`);
			}, url);
			await new Promise((resolve) => setTimeout(resolve, 50));
			await page.goBack();
			const element2 = await page.$('#tpl');
			const content = await page.content();
			expect(element2).not.toBeTruthy();
			expect(content).not.toMatch(/<style[^>]*>body{background:(red|#f00)}\.\w+-content{background:(blue|#00f)}/);
			expect(content).not.toMatch(/simple content/);
		});
	});

	describe('Styles', () => {
		it('should disable css modules', async () => {
			const output = await bundler({ ...config, modules: false, entry: './styles.jsx' });
			page = await openPage(getPuppeteerConfig(output));
			const content = await page.content();
			expect(content).toMatch(/<style[^>]*>body{background:(red|#f00)}\.content{background:(blue|#00f)}/);
			expect(content).toMatch(/simple content/);
			const bg = await page.evaluate(() => {
				const element = document.querySelector('.content');
				return window.getComputedStyle(element).getPropertyValue('background-color');
			});
			expect(bg).toMatch(/rgb\(0,\s*0,\s*255\)/);
		});

		it('should not append styles', async () => {
			const output = await bundler({ ...config, modules: false, extractCss: true, entry: './styles.jsx' });
			page = await openPage(getPuppeteerConfig(output));
			const element = await page.$('#tpl');
			expect(element).toBeTruthy();
			const content = await page.content();
			expect(content).not.toMatch(/<style[^>]*>body{background:(red|#f00)}\.content{background:(blue|#00f)}/);
			expect(content).toMatch(/simple content/);
			const bg = await page.evaluate(() => {
				const element = document.querySelector('.content');
				return window.getComputedStyle(element).getPropertyValue('background-color');
			});
			expect(bg).toMatch(/rgb\(253,\s*253,\s*255\)/);
		});

		it('should extract css to own file', async () => {
			const output = await bundler({
				...config,
				modules: false,
				extractCss: true,
				entry: './styles.jsx',
				buildDir: path.join('.build', 'css'),
			});
			page = await openPage(getPuppeteerConfig(output));
			const files = fs.readdirSync(path.resolve(__dirname, '.build', 'css'));
			expect(files).toContain('style.css');
			const file = fs.readFileSync(path.resolve(__dirname, '.build', 'css', 'style.css'), 'utf-8');
			expect(file).toMatch(/body{background:(red|#f00)}\.content{background:(blue|#00f)}/);
		});
	});
});

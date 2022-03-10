import 'expect-puppeteer';
import failOnConsole from 'jest-fail-on-console';
import { config } from '../lib/buildspec';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

global.configDefaults = {
	...config,
	sourcemap: false,
	url: [
		// example.com as data url
		'data:text/html;charset=utf-8;base64,PCFkb2N0eXBlIGh0bWw+DQo8aHRtbD4NCjxoZWFkPg0KICAgIDx0aXRsZT5FeGFtcGxlIERvbWFpbjwvdGl0bGU+DQoNCiAgICA8bWV0YSBjaGFyc2V0PSJ1dGYtOCIgLz4NCiAgICA8bWV0YSBodHRwLWVxdWl2PSJDb250ZW50LXR5cGUiIGNvbnRlbnQ9InRleHQvaHRtbDsgY2hhcnNldD11dGYtOCIgLz4NCiAgICA8bWV0YSBuYW1lPSJ2aWV3cG9ydCIgY29udGVudD0id2lkdGg9ZGV2aWNlLXdpZHRoLCBpbml0aWFsLXNjYWxlPTEiIC8+DQogICAgPHN0eWxlIHR5cGU9InRleHQvY3NzIj4NCiAgICBib2R5IHsNCiAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogI2YwZjBmMjsNCiAgICAgICAgbWFyZ2luOiAwOw0KICAgICAgICBwYWRkaW5nOiAwOw0KICAgICAgICBmb250LWZhbWlseTogLWFwcGxlLXN5c3RlbSwgc3lzdGVtLXVpLCBCbGlua01hY1N5c3RlbUZvbnQsICJTZWdvZSBVSSIsICJPcGVuIFNhbnMiLCAiSGVsdmV0aWNhIE5ldWUiLCBIZWx2ZXRpY2EsIEFyaWFsLCBzYW5zLXNlcmlmOw0KICAgICAgICANCiAgICB9DQogICAgZGl2IHsNCiAgICAgICAgd2lkdGg6IDYwMHB4Ow0KICAgICAgICBtYXJnaW46IDVlbSBhdXRvOw0KICAgICAgICBwYWRkaW5nOiAyZW07DQogICAgICAgIGJhY2tncm91bmQtY29sb3I6ICNmZGZkZmY7DQogICAgICAgIGJvcmRlci1yYWRpdXM6IDAuNWVtOw0KICAgICAgICBib3gtc2hhZG93OiAycHggM3B4IDdweCAycHggcmdiYSgwLDAsMCwwLjAyKTsNCiAgICB9DQogICAgYTpsaW5rLCBhOnZpc2l0ZWQgew0KICAgICAgICBjb2xvcjogIzM4NDg4ZjsNCiAgICAgICAgdGV4dC1kZWNvcmF0aW9uOiBub25lOw0KICAgIH0NCiAgICBAbWVkaWEgKG1heC13aWR0aDogNzAwcHgpIHsNCiAgICAgICAgZGl2IHsNCiAgICAgICAgICAgIG1hcmdpbjogMCBhdXRvOw0KICAgICAgICAgICAgd2lkdGg6IGF1dG87DQogICAgICAgIH0NCiAgICB9DQogICAgPC9zdHlsZT4gICAgDQo8L2hlYWQ+DQoNCjxib2R5Pg0KPGRpdj4NCiAgICA8aDE+RXhhbXBsZSBEb21haW48L2gxPg0KICAgIDxwPlRoaXMgZG9tYWluIGlzIGZvciB1c2UgaW4gaWxsdXN0cmF0aXZlIGV4YW1wbGVzIGluIGRvY3VtZW50cy4gWW91IG1heSB1c2UgdGhpcw0KICAgIGRvbWFpbiBpbiBsaXRlcmF0dXJlIHdpdGhvdXQgcHJpb3IgY29vcmRpbmF0aW9uIG9yIGFza2luZyBmb3IgcGVybWlzc2lvbi48L3A+DQogICAgPHA+PGEgaHJlZj0iaHR0cHM6Ly93d3cuaWFuYS5vcmcvZG9tYWlucy9leGFtcGxlIj5Nb3JlIGluZm9ybWF0aW9uLi4uPC9hPjwvcD4NCjwvZGl2Pg0KPC9ib2R5Pg0KPC9odG1sPg==',
	],
	browser: process.env.BROWSER || '',
	bundler: {
		plugins: [
			// Add extra entry to alias plugin config
			[
				'alias',
				(options) => ({
					...options,
					entries: [
						...options.entries,
						{ find: 'a-b-doer/hooks', replacement: path.join(__dirname, '..', 'hooks') },
						{ find: 'a-b-doer', replacement: path.join(__dirname, '..', 'main') },
					],
				}),
			],
		],
	},
};

process.env.TEST_ENV = true;
process.env.IE = false;

jest.setTimeout(10000);

failOnConsole();

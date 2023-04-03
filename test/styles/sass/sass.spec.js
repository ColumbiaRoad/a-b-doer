import { bundler } from '../../../lib/bundler';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { expect, describe, it } from 'vitest';
import { config as defaultConfig } from '../../../lib/buildspec';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
		};
	},
};

describe('SASS/SCSS', () => {
	it('should create file with index.scss', async () => {
		await bundler({ ...config, entry: './index.scss' });
		const content = fs.readFileSync(`${__dirname}/.build/index.css`, { encoding: 'utf8' });
		expect(content).toMatch(/body\{background:(#f00|red)\}body #t\w{5}-wrapper\{border:1px solid (#f00|red)\}/);
	});

	it('should create file with foo.sass', async () => {
		await bundler({ ...config, entry: './foo.sass' });
		const content = fs.readFileSync(`${__dirname}/.build/foo.css`, { encoding: 'utf8' });
		expect(content).toMatch(/body\{background:(#00f|blue)\}body #t\w{5}-wrapper\{border:1px solid (#00f|blue)\}/);
	});

	it('should create correct non-module file', async () => {
		await bundler({ ...config, entry: './index.scss', minify: true, modules: false });
		const content = fs.readFileSync(`${__dirname}/.build/index.css`, { encoding: 'utf8' });
		expect(content).toMatch(/body\{background:(#f00|red)\}body #wrapper\{border:1px solid (#f00|red)\}/);
	});

	it('should create correct unminified file', async () => {
		await bundler({ ...config, entry: './index.scss', minify: false, modules: false });
		const content = fs.readFileSync(`${__dirname}/.build/index.css`, { encoding: 'utf8' });
		expect(content).toBe(`body {
  background: red;
}
body #wrapper {
  border: 1px solid red;
}`);
	});
});

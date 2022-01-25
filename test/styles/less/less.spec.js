import { bundler } from '../../../lib/bundler';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

jest.setTimeout(20000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = { ...global.configDefaults, testPath: __dirname };

describe('LESS', () => {
	test('should create file with index.less', async () => {
		await bundler({ ...config, entry: './index.less' });
		const content = fs.readFileSync(__dirname + '/.build/index.css', { encoding: 'utf8' });
		expect(content).toMatch(/body\{background:(#f00|red)\}body #t1m9j-wrapper\{border:1px solid (#f00|red)\}/);
	});

	test('should create file with foo.less', async () => {
		await bundler({ ...config, entry: './foo.less' });
		const content = fs.readFileSync(__dirname + '/.build/foo.css', { encoding: 'utf8' });
		expect(content).toMatch(/body\{background:(#00f|blue)\}body #t1afo-wrapper\{border:1px solid (#00f|blue)\}/);
	});

	test('should correct module file', async () => {
		await bundler({ ...config, entry: './index.less', modules: false });
		const content = fs.readFileSync(__dirname + '/.build/index.css', { encoding: 'utf8' });
		expect(content).toMatch(/body\{background:(#f00|red)\}body #wrapper\{border:1px solid (#f00|red)\}/);
	});

	test('should correct unminified file', async () => {
		await bundler({ ...config, entry: './index.less', minify: false, modules: false });
		const content = fs.readFileSync(__dirname + '/.build/index.css', { encoding: 'utf8' });
		expect(content).toBe(`body {
  background: red;
}
body #wrapper {
  border: 1px solid red;
}
`);
	});
});

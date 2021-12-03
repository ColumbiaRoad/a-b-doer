const fs = require('fs');
const { bundler } = require('../../../dist/lib/bundler');

const config = { ...global.configDefaults, testPath: __dirname };

describe('SASS/SCSS', () => {
	test('should create file with index.less', async () => {
		await bundler({ ...config, entry: './index.scss' });
		const content = fs.readFileSync(__dirname + '/.build/index.css', { encoding: 'utf8' });
		expect(content).toMatch(/body\{background:(#f00|red)\}body #t1ux8-wrapper\{border:1px solid (#f00|red)\}/);
	});

	test('should create file with foo.less', async () => {
		await bundler({ ...config, entry: './foo.sass' });
		const content = fs.readFileSync(__dirname + '/.build/foo.css', { encoding: 'utf8' });
		expect(content).toMatch(/body\{background:(#00f|blue)\}body #tm0u5-wrapper\{border:1px solid (#00f|blue)\}/);
	});

	test('should correct module file', async () => {
		await bundler({ ...config, entry: './index.scss', modules: false });
		const content = fs.readFileSync(__dirname + '/.build/index.css', { encoding: 'utf8' });
		expect(content).toMatch(/body\{background:(#f00|red)\}body #wrapper\{border:1px solid (#f00|red)\}/);
	});

	test('should correct unminified file', async () => {
		await bundler({ ...config, entry: './index.scss', minify: false, modules: false });
		const content = fs.readFileSync(__dirname + '/.build/index.css', { encoding: 'utf8' });
		expect(content).toBe(`body {
  background: red; }
  body #wrapper {
    border: 1px solid red; }
`);
	});
});

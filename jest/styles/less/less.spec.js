const fs = require('fs');
const { bundler } = require('../../../dist/lib/bundler');

const config = { ...global.configDefaults, testPath: __dirname };

describe('LESS', () => {
	test('should create file with index.less', async (done) => {
		await bundler({ ...config, entry: './index.less' });
		const content = fs.readFileSync(__dirname + '/.build/index.css', { encoding: 'utf8' });
		expect(content).toBe('body{background:red}body #t18hw_wrapper{border:1px solid red}');
		done();
	});

	test('should create file with foo.less', async (done) => {
		await bundler({ ...config, entry: './foo.less' });
		const content = fs.readFileSync(__dirname + '/.build/foo.css', { encoding: 'utf8' });
		expect(content).toBe('body{background:#00f}body #t1mqa_wrapper{border:1px solid #00f}');
		done();
	});

	test('should correct module file', async (done) => {
		await bundler({ ...config, entry: './index.less', modules: false });
		const content = fs.readFileSync(__dirname + '/.build/index.css', { encoding: 'utf8' });
		expect(content).toBe('body{background:red}body #wrapper{border:1px solid red}');
		done();
	});

	test('should correct unminified file', async (done) => {
		await bundler({ ...config, entry: './index.less', minify: false, modules: false });
		const content = fs.readFileSync(__dirname + '/.build/index.css', { encoding: 'utf8' });
		expect(content).toBe(`body {
  background: red;
}
body #wrapper {
  border: 1px solid red;
}
`);
		done();
	});
});

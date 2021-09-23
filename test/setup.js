const { config } = require('../lib/buildspec');

global.configDefaults = {
	...config,
	url: ['http://example.com/'],
	browser: process.env.BROWSER || '',
};

process.env.TEST_ENV = true;
process.env.IE = false;

jest.setTimeout(10000);

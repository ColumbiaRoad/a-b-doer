// @vitest-environment node
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import { config } from '../../lib/buildspec';
import { getBundlerConfigs } from '../../lib/bundler';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.join(__dirname, '..', '..');

const { bundlerConfig } = getBundlerConfigs({
	...config,
	buildDir: '.build',
	entry: './no-file.js',
	testPath: 'test',
});

export default defineConfig({
	...bundlerConfig,
	test: {
		css: true,
		globals: true,
		environment: 'node',
		setupFiles: [path.join(rootDir, 'test', 'setup.js')],
		globalSetup: [path.join(rootDir, 'test', 'global-setup.js')],
	},
});

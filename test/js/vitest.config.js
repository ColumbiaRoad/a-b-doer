import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import { config } from '../../lib/buildspec';
import { getBundlerConfigs } from '../../lib/bundler';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.join(__dirname, '..', '..').replaceAll('\\', '/');

const { bundlerConfig } = getBundlerConfigs({
	...config,
	buildDir: '.build',
	entry: './no-file.js',
	testPath: 'test',
	bundler: {
		esbuild: {
			jsx: 'transform',
			jsxFactory: 'h',
			jsxFragment: 'hf',
			jsxInject: `import {h,hf} from "${path.posix.join(rootDir, 'src', 'jsx')}"`,
		},
	},
});

export default defineConfig({
	...bundlerConfig,
	resolve: {
		alias: [
			{ find: 'a-b-doer/hooks', replacement: path.join(rootDir, 'hooks') },
			{ find: 'a-b-doer', replacement: path.join(rootDir, 'main') },
		],
	},
	test: {
		css: true,
		globals: true,
		environment: 'jsdom',
		setupFiles: [path.join(rootDir, 'test', 'setup.js')],
		globalSetup: [path.join(rootDir, 'test', 'global-setup.js')],
	},
});

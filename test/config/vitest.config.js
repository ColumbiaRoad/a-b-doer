import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.join(__dirname, '..', '..');

export default defineConfig({
	entry: './no-file.js',
	test: {
		css: true,
		globals: true,
		globalSetup: [path.join(rootDir, 'test', 'global-setup.js')],
		setupFiles: [path.join(rootDir, 'test', 'setup.js'), path.join(rootDir, 'test', 'config', 'setup.js')],
	},
});

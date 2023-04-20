import { globSync } from 'glob';
import { rimrafSync } from 'rimraf';

export function teardown() {
	const dirs = globSync('./**/.build');
	dirs.forEach((dir) => rimrafSync(dir));
	console.log('Cleared all test build folders...');
}

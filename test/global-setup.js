import glob from 'glob';
import rimraf from 'rimraf';

export function teardown() {
	const dirs = glob.sync('./**/.build');
	dirs.forEach((dir) => rimraf.sync(dir));
	console.log('Cleared all test build folders...');
}

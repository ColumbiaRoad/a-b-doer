import { append, pollQuerySelector } from 'a-b-doer';
import './src/styles.scss';

pollQuerySelector('html body', (body) => {
	import('./src/templates').then(({ Hooks }) => {
		append(<Hooks id="chunks" />, body);
	});
});

import { append, pollQuerySelector } from 'a-b-doer';
import './src/styles.scss';

export default () => {
	pollQuerySelector('html body', (body) => {
		import('./src/templates').then(({ Hooks }) => {
			append(<Hooks id="chunks" />, body);
		});
	});
};

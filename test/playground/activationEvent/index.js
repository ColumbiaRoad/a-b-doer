import { pollQuerySelector, append } from 'a-b-doer';
import './styles.scss';

const node = Object.assign(document.createElement('div'), { innerHTML: 'testing...' });

pollQuerySelector('body > div', (div) => {
	append(node, div);
});

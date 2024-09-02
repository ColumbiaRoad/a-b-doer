import { append, pollQuerySelector } from 'a-b-doer';
import { Simple } from './src/templates';
import './src/styles.scss';

pollQuerySelector('body > div', (body) => {
	append(<Simple class="no-modules" id="tpl" />, body);
});
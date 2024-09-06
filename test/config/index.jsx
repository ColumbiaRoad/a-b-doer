import { append, pollQuerySelector } from 'a-b-doer';
import { Simple } from './src/templates';
import { content } from './src/styles.scss';

pollQuerySelector('body > div', (body) => {
	append(<Simple class={content} id="tpl" />, body);
});

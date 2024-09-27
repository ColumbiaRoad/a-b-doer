import { append, pollQuerySelector } from 'a-b-doer';
import { Simple } from './src/templates';
import { content } from './src/styles.scss';

window.injectionCalled = window.injectionCalled || 0;
window.injectionCalled += 1;

pollQuerySelector('body > div', (body) => {
	append(<Simple class={content} id="tpl" />, body);
});

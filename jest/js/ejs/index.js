import { pollQuerySelector } from '@/utils/dom';
import ejsTpl from './template.ejs';
import htmlTpl from './template.html';
import './styles.scss';

pollQuerySelector('html body', (target) => {
	target.innerHTML += ejsTpl({ test: 1 });
	target.innerHTML += htmlTpl({ test: 2 });
});

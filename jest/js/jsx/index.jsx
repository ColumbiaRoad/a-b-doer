import { append, pollQuerySelector } from '@/utils/dom';
import Template from './template';
import './styles.scss';

pollQuerySelector('html body', (body) => {
	append(<Template id="tpl1" foo="0" />, body);
	append(<Template id="tpl2" foo="1" />, body);
	append(<Template id="tpl3" foo="2" bar="1" />, body);
});

import { append, pollQuerySelector } from 'a-b-doer';
import { Simple, RefHook, Hooks, Switch } from './templates';
import './styles.scss';

pollQuerySelector('html body', (body) => {
	append(<Simple id="tpl1" foo="0" />, body);
	append(<Simple id="tpl2" foo="1" />, body);
	append(<Simple id="tpl3" foo="2" bar="1" />, body);
	append(<RefHook id="tpl4" />, body);
	append(<Hooks id="tpl5" />, body);
	append(<Hooks id="tpl6" />, body);
	append(<Switch id="tpl7" />, body);
});

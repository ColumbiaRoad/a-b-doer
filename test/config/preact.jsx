import { append, pollQuerySelector } from 'a-b-doer';
import { render } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import './src/styles.scss';

const HookSubTemplate = (props) => {
	const { parent } = props;
	useEffect(() => {
		if (parent.current) {
			parent.current.style.background = 'blue';
		}
	}, []);
	return <div>BarPreact</div>;
};

const Hooks = (props) => {
	const { id } = props;
	const node = useRef();
	const [val, setVal] = useState(1);

	useEffect(() => {
		setVal(2);
	}, []);

	return (
		<div id={id} data-o={'t-temp-' + id}>
			<div ref={node}>
				<div id={id + 'click'} onClick={() => setVal(val + 1)}>
					ValPreact:{val}
				</div>
				<HookSubTemplate parent={node} />
			</div>
		</div>
	);
};

pollQuerySelector('html body', (body) => {
	const component = <Hooks id="preact" />;
	console.log(component);
	const div = document.createElement('div');
	append(div, body);
	render(component, div);
});

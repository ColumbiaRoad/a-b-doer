import { useRef, useEffect, useState } from 'a-b-doer/hooks';

export const Simple = (props) => {
	const { id, ...rest } = props;

	return (
		<div id={id} data-o={'t-temp-' + id} class="simple">
			JSX Template {JSON.stringify(rest)}
		</div>
	);
};

const SubTemplate = (props) => {
	const { sibling } = props;
	if (sibling.current) {
		sibling.current.style.background = 'red';
	}
	return <div>Foo</div>;
};

export const RefHook = (props) => {
	const { id } = props;
	const node = useRef();

	return (
		<div id={id} data-o={'t-temp-' + id}>
			<div ref={node}></div>
			<SubTemplate sibling={node} />
		</div>
	);
};

const HookSubTemplate = (props) => {
	const { parent } = props;
	useEffect(() => {
		if (parent.current) {
			parent.current.style.background = 'blue';
		}
	}, []);
	return <div>Bar</div>;
};

export const Hooks = (props) => {
	const { id } = props;
	const node = useRef();
	const [val, setVal] = useState(1);

	useEffect(() => {
		setVal(2);
		return () => {
			// We're running these tests with jest puppeteer so we should use something serializeable when checking
			// if some method has been called in window scope.
			window.effectCb = true;
		};
	}, []);

	return (
		<div id={id} data-o={'t-temp-' + id}>
			<div ref={node}>
				<div id={id + 'click'} onClick={() => setVal(val + 1)}>
					Val:{val}
				</div>
				<HookSubTemplate parent={node} />
			</div>
		</div>
	);
};

export const Switch = ({ id }) => {
	const [val, setVal] = useState(0);

	useEffect(() => {
		setVal(1);
	}, []);

	return (
		<div id={id} data-o={'t-temp-' + id}>
			<div>First</div>
			{!val ? <div>Val:{val}</div> : <p>ValP:{val}</p>}
			<div>Last</div>
		</div>
	);
};

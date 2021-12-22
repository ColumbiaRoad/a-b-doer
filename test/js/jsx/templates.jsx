import { useRef, useEffect, useState } from 'a-b-doer/hooks';

export const Simple = (props) => {
	const { id, className = 'simple', ...rest } = props;

	return (
		<div id={id} data-o={'t-temp-' + id} class={className}>
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

const Loading = ({ num }) => {
	return (
		<div>
			<h1>Loading... {num}</h1>
		</div>
	);
};

export const OrderApp = ({ id, children }) => {
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		setTimeout(() => {
			setLoading(false);
		}, 100);
	}, []);

	return loading ? (
		<Loading num="1" />
	) : (
		<div id={id} data-o={'t-temp-' + id}>
			{children}
		</div>
	);
};

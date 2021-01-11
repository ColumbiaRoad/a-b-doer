import { useRef, useHook } from 'a-b-doer/hooks';

export const Simple = (props) => {
	const { id, ...rest } = props;

	return (
		<div id={id} class="simple">
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
		<div id={id}>
			<div ref={node}></div>
			<SubTemplate sibling={node} />
		</div>
	);
};

const HookSubTemplate = (props) => {
	const { parent } = props;
	useHook(() => {
		if (parent.current) {
			parent.current.style.background = 'blue';
		}
	});
	return <div>Bar</div>;
};

export const Hooks = (props) => {
	const { id } = props;
	const node = useRef();

	return (
		<div id={id} ref={node}>
			<HookSubTemplate parent={node} />
		</div>
	);
};

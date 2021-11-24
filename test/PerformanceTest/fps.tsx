import { pollQuerySelector } from 'a-b-doer';
// import { render } from 'a-b-doer';
// import { useEffect, useState } from 'a-b-doer/hooks';
import { init } from './src/stats';
import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import './styles.scss';

const TestComponent = () => {
	const [val, setVal] = useState(0);

	useEffect(() => {
		setTimeout(() => {
			setVal(val + 1);
		}, 1000 / 60);
	}, [val]);

	return (
		<div>
			<h1 style={{ textAlign: 'center' }}>{val}</h1>
		</div>
	);
};

pollQuerySelector('#app', (target) => {
	init();
	render(<TestComponent />, target);
});

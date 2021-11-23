import { pollQuerySelector } from 'a-b-doer';
import { append } from 'a-b-doer';
import { useEffect, useState } from 'a-b-doer/hooks';
// import { render } from 'preact';
// import { useEffect, useState } from 'preact/hooks';
import './styles.scss';

function shuffle(array) {
	let currentIndex = array.length,
		randomIndex;

	// While there remain elements to shuffle...
	while (currentIndex != 0) {
		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex--;

		// And swap it with the current element.
		[array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
	}

	return array;
}

const Arr = Array(10000)
	.fill(1)
	.map((_, i) => `Text ${i}`);

const TestComponent = () => {
	const [showModal, setShowModal] = useState(false);
	const [arr, setArr] = useState(Arr);

	useEffect(() => {
		setTimeout(() => {
			setShowModal(true);
		}, 50);
		setTimeout(() => {
			setShowModal(false);
		}, 250);
	}, []);

	return (
		<div>
			<h3>
				<a onClick={() => setArr(shuffle(arr))}>Shuffle</a>
			</h3>
			{arr.map((v) => (
				<div key={v}>
					{v} - {showModal.toString()}
				</div>
			))}
		</div>
	);
};

pollQuerySelector('#app', (target) => {
	console.time();
	append(<TestComponent />, target);
	// render(<TestComponent />, target);
	console.timeEnd();
});

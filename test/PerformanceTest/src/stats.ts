export function init() {
	const script = document.createElement('script');
	script.onload = function () {
		const stats = new (window as any).Stats();
		document.body.appendChild(stats.dom);
		stats.dom.style.right = '0';
		stats.dom.style.left = 'auto';
		let cur = 0;
		stats.dom.addEventListener('click', () => {
			cur++;
			if (cur >= 3) cur = 0;
			stats.showPanel(cur);
		});
		requestAnimationFrame(function loop() {
			stats.update();
			requestAnimationFrame(loop);
		});
	};
	script.src = '//mrdoob.github.io/stats.js/build/stats.min.js';
	document.head.appendChild(script);
}

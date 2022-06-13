import { append, pollQuerySelector, unmount } from 'a-b-doer';
import { useState, useRef } from 'a-b-doer/hooks';
import styles from './styles.scss';
import Toggle from './toggle';

const logo =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJUAAAByCAMAAABtPWNHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAE9GlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNy4xLWMwMDAgNzkuOWNjYzRkZTkzLCAyMDIyLzAzLzE0LTE0OjA3OjIyICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjMuMyAoTWFjaW50b3NoKSIgeG1wOkNyZWF0ZURhdGU9IjIwMjItMDYtMDNUMTY6MjI6NDIrMDM6MDAiIHhtcDpNb2RpZnlEYXRlPSIyMDIyLTA2LTA0VDEwOjEwOjQ4KzAzOjAwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDIyLTA2LTA0VDEwOjEwOjQ4KzAzOjAwIiBkYzpmb3JtYXQ9ImltYWdlL3BuZyIgcGhvdG9zaG9wOkNvbG9yTW9kZT0iMyIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpkMDA1NzFlMS03M2QyLTRjZjUtODhjYS00YWIyMTJhNzMyN2IiIHhtcE1NOkRvY3VtZW50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';

const Toolbar = ({ config, testPath, testId, customToolbar }) => {
	const [open, setOpen] = useState(false);
	const [highlight, setHighlight] = useState(false);
	const [disabled, setDisable] = useState(config.disabled);
	const [fullscreen, setFullscreen] = useState(true);
	const ref = useRef();

	const toggles = [
		{
			label: 'Highlight injections',
			value: highlight,
			onChange: () => {
				if (!highlight) {
					showInjectionBorders(testId);
				} else {
					hideInjectionBorders();
				}
				setHighlight(!highlight);
			},
		},
		{
			label: 'Disable current injection',
			value: disabled,
			onChange: () => {
				setDisable(!disabled);
				window.toggleInjection();
				location.reload();
			},
		},
	];

	return (
		<div id="a-b-toolbar" class={`${styles.toolbar} ${open ? styles.open : styles.closed}`} ref={ref}>
			<img src={logo} />
			{toggles.map((tgl, index) => (
				<>
					<Toggle key={`toggle${index}`} {...tgl} />
					<hr />
				</>
			))}
			<div>
				In preview: <small>{testPath}</small>
			</div>
			<button class={styles.previewButton} onClick={() => window.takeScreenshot(fullscreen)}>
				Take screenshot
			</button>
			<div>
				<small>
					<label>
						<input
							type="checkbox"
							checked={fullscreen}
							onChange={() => setFullscreen(!fullscreen)}
							style={{
								display: 'inline',
								width: 'auto',
								padding: 0,
								margin: '0 5px 0 0',
								border: 0,
							}}
						/>{' '}
						Full page screenshot
					</label>
				</small>
			</div>
			<hr />
			<button
				class={styles.previewButton}
				onClick={() => {
					console.log(
						'%c A/B Doer test config\n',
						'color: cyan; font-size: 1.5em; text-shadow: 1px 1px 1px #000',
						config
					);
				}}
			>
				Print generated config
			</button>
			<hr />
			{customToolbar && <section dangerouslySetInnerHTML={{ __html: customToolbar }}></section>}
			<a
				onClick={() => {
					hideInjectionBorders();
					unmount(ref.current);
				}}
			>
				Remove toolbar DOM
			</a>
			<button class={styles.toggle} onClick={() => setOpen(!open)} title="Toggle A/B test toolbar"></button>
		</div>
	);
};

function showInjectionBorders(testId) {
	document.querySelectorAll('[data-o]').forEach((node) => {
		if (node.dataset.o === 'tlbr01') {
			return;
		}
		if (node.dataset.o === testId) {
			node.style.boxShadow = 'inset 0 0 5px #0012ff, 0 0 5px #0012ff';
		} else {
			node.style.boxShadow = 'inset 0 0 5px #f00, 0 0 5px #f00';
		}
	});
}
function hideInjectionBorders() {
	document.querySelectorAll('[data-o]').forEach((node) => {
		node.style.boxShadow = null;
	});
}

pollQuerySelector('body', (target) => {
	append(
		<Toolbar testId={window.abPreview.testId} config={window.abPreview.config} testPath={window.abPreview.testPath} />,
		target
	);
});

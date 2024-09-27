import Toolbar from './index';
import { append } from 'a-b-doer';

const container = document.createElement('div');
container.id = 'pptr-toolbar';
container.style.all = 'unset';
const shadow = container.attachShadow({ mode: 'open' });
const styles = document.getElementById('pptr-toolbar-styles');
shadow.appendChild(styles);
document.body.appendChild(container);

append(
	<Toolbar testId={window.abPreview.testId} config={window.abPreview.config} testPath={window.abPreview.testPath} />,
	shadow
);

import Toolbar from './index';
import { append } from 'a-b-doer';

append(
	<Toolbar testId={window.abPreview.testId} config={window.abPreview.config} testPath={window.abPreview.testPath} />,
	document.body
);

import { append } from 'a-b-doer';
import { useState } from 'a-b-doer/hooks';
const Foo = () => {
	const [inc, setInc] = useState(1);
	return <div onClick={() => setInc(inc + 1)}>{inc}</div>;
};
append(<Foo />, document.body);

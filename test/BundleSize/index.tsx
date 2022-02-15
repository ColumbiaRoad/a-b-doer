import { append } from 'a-b-doer';
import { useState } from 'a-b-doer/hooks';
// import { Component } from 'a-b-doer';
// class Foo extends Component {
// 	state = {
// 		inc: 0,
// 	};
// 	render() {
// 		return <div onClick={() => this.setState({ inc: this.state.inc + 1 })}>{this.state.inc}</div>;
// 	}
// }
const Foo = () => {
	const [inc, setInc] = useState(1);
	return <div onClick={() => setInc(inc + 1)}>{inc}</div>;
};
append(<Foo />, document.body);

export default props => {
	const {id, ...rest} = props;

	return <div id={id} class="tpl">
		JSX Template {JSON.stringify(rest)}
	</div>
}

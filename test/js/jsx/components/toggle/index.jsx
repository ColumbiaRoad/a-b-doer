import styles from './styles.scss';

const Toggle = ({ label, onChange, value = false }) => {
	return (
		<label class={styles.toggle} data-test="toggle">
			<input type="checkbox" checked={value} onChange={onChange} data-test="input" />
			<span class={styles.icon} data-test="icon" />
			{label}
		</label>
	);
};

export default Toggle;

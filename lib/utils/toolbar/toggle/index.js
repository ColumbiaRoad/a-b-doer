import styles from './styles.scss';

const Toggle = ({ label, onChange, value = false }) => {
	return (
		<label class={styles.toggle}>
			<input type="checkbox" checked={value} onChange={onChange} />
			<span class={styles.icon}>
				<span></span>
			</span>
			{label}
		</label>
	);
};

export default Toggle;

import styles from './styles.scss';

type Props = { size: number };

const Spinner = (props: Props) => {
	const { size = 48 } = props;
	return (
		<span className={`${styles.spinner} pptr-toolbar-spinner`} style={{ width: `${size}px`, height: `${size}px` }} />
	);
};

export default Spinner;

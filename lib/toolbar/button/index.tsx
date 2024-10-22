import Spinner from '../spinner';
import styles from './styles.scss';

type Props = HTMLButtonElement & { loading?: boolean; compact?: boolean };

console.log(styles);

const Button = (props: Props) => {
	const { loading, children, compact, ...restProps } = props;
	return (
		<button
			className={[styles.button, loading && styles.loading, compact && styles.compact].filter(Boolean).join(' ')}
			{...restProps}
		>
			{loading ? <Spinner size={30} /> : children}
		</button>
	);
};

export default Button;

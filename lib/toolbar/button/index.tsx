import Spinner from '../spinner';
import styles from './styles.scss';

type Props = HTMLButtonElement & { loading?: boolean };

console.log(styles);

const Button = (props: Props) => {
	const { loading, children, ...restProps } = props;
	return (
		<button className={[styles.button, loading && styles.loading].filter(Boolean).join(' ')} {...restProps}>
			{loading ? <Spinner size={30} /> : children}
		</button>
	);
};

export default Button;

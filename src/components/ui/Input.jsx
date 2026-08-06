import { cx, fieldBase, fieldSize } from './utils';
import Field from './Field';

export default function Input({
    label,
    error,
    hint,
    className = '',
    containerClassName = '',
    ...rest
}) {
    const invalid = Boolean(error);
    return (
        <Field label={label} error={error} hint={hint} className={containerClassName}>
            <input className={cx(fieldBase(invalid), fieldSize, className)} {...rest} />
        </Field>
    );
}
import { cx, fieldBase, fieldSize } from './utils';
import Field from './Field';

export default function TextArea({
    label,
    error,
    hint,
    rows = 3,
    className = '',
    containerClassName = '',
    ...rest
}) {
    const invalid = Boolean(error);
    return (
        <Field label={label} error={error} hint={hint} className={containerClassName}>
            <textarea
                rows={rows}
                className={cx(fieldBase(invalid), fieldSize, 'resize-none', className)}
                {...rest}
            />
        </Field>
    );
}
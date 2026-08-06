import { cx, fieldBase, fieldSize } from './utils';
import Field from './Field';

export default function Select({
    label,
    error,
    hint,
    className = '',
    containerClassName = '',
    children,
    ...rest
}) {
    const invalid = Boolean(error);
    return (
        <Field label={label} error={error} hint={hint} className={containerClassName}>
            <select
                className={cx(
                    fieldBase(invalid),
                    fieldSize,
                    'cursor-pointer [color-scheme:dark] appearance-none',
                    className,
                )}
                {...rest}
            >
                {children}
            </select>
        </Field>
    );
}
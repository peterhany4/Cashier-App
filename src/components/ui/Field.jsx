import { cx } from './utils';

export default function Field({ label, htmlFor, error, hint, children, className = '', labelClassName = '' }) {
    return (
        <div className={cx('flex flex-col gap-1.5', className)}>
            {label && (
                <label htmlFor={htmlFor} className={cx('font-bold text-xs text-slate-600', labelClassName)}>
                    {label}
                </label>
            )}
            {children}
            {error ? (
                <span className="text-xs font-semibold text-danger-600">{error}</span>
            ) : hint ? (
                <span className="text-xs text-slate-500">{hint}</span>
            ) : null}
        </div>
    );
}
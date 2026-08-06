import { cx } from './utils';

const VARIANTS = {
    neutral: 'bg-surface-3/60 text-slate-600 border-surface-4/50',
    success: 'bg-brand-500/10 text-brand-700 border-brand-500/30',
    warning: 'bg-warning-500/15 text-warning-700 border-warning-600/30',
    danger: 'bg-danger-500/10 text-danger-700 border-danger-500/30',
    info: 'bg-info-500/10 text-info-700 border-info-500/30',
};

const SIZES = {
    sm: 'text-[11px] px-2 py-0.5 rounded-full',
    md: 'text-xs px-2.5 py-1 rounded-full',
};

const DOT = {
    neutral: 'bg-slate-400',
    success: 'bg-brand-400',
    warning: 'bg-warning-500',
    danger: 'bg-danger-400',
    info: 'bg-info-400',
};

export default function Badge({ variant = 'neutral', size = 'sm', dot = false, className = '', children, ...props }) {
    return (
        <span
            className={cx(
                'inline-flex items-center gap-1.5 font-bold border whitespace-nowrap',
                VARIANTS[variant],
                SIZES[size],
                className,
            )}
            {...props}
        >
            {dot && <span className={cx('w-1.5 h-1.5 rounded-full', DOT[variant])} />}
            {children}
        </span>
    );
}
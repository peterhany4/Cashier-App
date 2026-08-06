import { Loader2 } from 'lucide-react';
import { cx } from './utils';

const VARIANTS = {
    primary: 'bg-brand-600 hover:bg-brand-500 text-white shadow shadow-brand-950/40',
    secondary: 'bg-surface-3 hover:bg-surface-4 text-slate-200 shadow-sm',
    danger: 'bg-danger-500/10 hover:bg-danger-500/20 text-danger-400 border border-danger-500/30',
    warning: 'bg-warning-500/15 hover:bg-warning-500/25 text-warning-500 border border-warning-600/30',
    ghost: 'text-slate-300 hover:text-white hover:bg-surface-3/50',
    outline: 'border border-surface-4 text-slate-200 hover:bg-surface-3/40',
};

const SIZES = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2 text-sm rounded-xl',
    lg: 'px-6 py-3 text-sm rounded-xl',
};

export default function Button({
    variant = 'primary',
    size = 'md',
    block = false,
    loading = false,
    leftIcon: LeftIcon = null,
    rightIcon: RightIcon = null,
    className = '',
    disabled = false,
    children,
    ...rest
}) {
    return (
        <button
            disabled={disabled || loading}
            className={cx(
                'inline-flex items-center justify-center gap-2 font-bold',
                'transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50',
                'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap',
                VARIANTS[variant],
                SIZES[size],
                block && 'w-full',
                className,
            )}
            {...rest}
        >
            {loading ? (
                <Loader2 size={16} className="animate-spin" />
            ) : (
                LeftIcon && <LeftIcon size={16} strokeWidth={2.5} />
            )}
            {children}
            {!loading && RightIcon && <RightIcon size={16} strokeWidth={2.5} />}
        </button>
    );
}
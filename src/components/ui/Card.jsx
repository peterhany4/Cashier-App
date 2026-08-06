import { cx } from './utils';

export default function Card({
    as: Tag = 'div',
    padding = 'p-5',
    className = '',
    children,
    ...rest
}) {
    return (
        <Tag
            className={cx('bg-surface-1 border border-surface-3/60 rounded-2xl', padding, className)}
            {...rest}
        >
            {children}
        </Tag>
    );
}

export function CardHeader({ title, subtitle, action, className = '' }) {
    return (
        <div className={cx('flex flex-wrap items-center justify-between gap-3 pb-3', className)}>
            <div>
                {title && <h4 className="font-bold text-slate-100">{title}</h4>}
                {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
            {action}
        </div>
    );
}
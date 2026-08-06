import { PackageX } from 'lucide-react';
import { cx } from './utils';

export default function EmptyState({
    icon: Icon = PackageX,
    title,
    message,
    action,
    className = '',
}) {
    return (
        <div className={cx('flex flex-col items-center justify-center text-center py-12 px-4', className)}>
            <span className="p-3 rounded-full bg-surface-3/60 text-slate-500 mb-3">
                <Icon size={28} strokeWidth={1.75} />
            </span>
            {title && <p className="font-bold text-slate-700">{title}</p>}
            {message && <p className="text-xs text-slate-500 mt-1 max-w-sm">{message}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
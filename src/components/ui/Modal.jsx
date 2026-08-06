import { X } from 'lucide-react';
import { cx } from './utils';

const SIZES = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
};

export default function Modal({ open, onClose, title, size = 'md', className = '', children }) {
    if (!open) return null;
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn"
            onMouseDown={onClose}
        >
            <div
                className={cx('bg-surface-1 border border-surface-3/70 rounded-2xl shadow-2xl w-full text-right animate-scaleUp', SIZES[size], className)}
                onMouseDown={(e) => e.stopPropagation()}
            >
                {title && (
                    <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-2">
                        <h3 className="text-lg font-bold text-white">{title}</h3>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-surface-3/40 transition"
                            aria-label="إغلاق"
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}
                {children}
            </div>
        </div>
    );
}
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle } from 'lucide-react';
import { cx } from './utils';

const ToastContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within a ToastProvider');
    return ctx;
}

const STYLES = {
    success: { wrap: 'bg-brand-600 border-brand-500', Icon: CheckCircle2 },
    danger: { wrap: 'bg-danger-600 border-danger-500', Icon: XCircle },
    warning: { wrap: 'bg-warning-600 border-warning-500', Icon: AlertTriangle },
    info: { wrap: 'bg-info-600 border-info-500', Icon: Info },
};

export default function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const idRef = useRef(0);

    const dismiss = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const notify = useCallback((message, type = 'success', duration = 3500) => {
        const id = ++idRef.current;
        setToasts((prev) => [...prev, { id, message, type }]);
        if (duration > 0) {
            setTimeout(() => dismiss(id), duration);
        }
    }, [dismiss]);

    const toast = useCallback((message, type = 'success') => notify(message, type), [notify]);

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 pointer-events-none">
                {toasts.map((t) => {
                    const { wrap, Icon } = STYLES[t.type] || STYLES.info;
                    return (
                        <div
                            key={t.id}
                            className={cx('w-fit px-5 py-3 rounded-xl shadow-xl text-sm font-semibold text-white border animate-scaleUp pointer-events-auto', wrap)}
                            role="status"
                        >
                            <span className="inline-flex items-center gap-2">
                                <Icon size={18} />
                                {t.message}
                            </span>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}
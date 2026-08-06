import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

const ConfirmContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm() {
    const ctx = useContext(ConfirmContext);
    if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
    return ctx;
}

// confirmDialog(options) => Promise<boolean>
// options: { title, message, confirmLabel, cancelLabel, variant: 'danger' | 'secondary' }
export default function ConfirmProvider({ children }) {
    const [state, setState] = useState(null); // { options, resolve }
    const resolver = useRef(null);

    const confirm = useCallback((options = {}) => {
        return new Promise((resolve) => {
            resolver.current = resolve;
            setState(options);
        });
    }, []);

    const close = useCallback((result) => {
        if (resolver.current) {
            resolver.current(result);
            resolver.current = null;
        }
        setState(null);
    }, []);

    const variant = state?.variant || 'danger';
    const confirmLabel = state?.confirmLabel || 'تأكيد';
    const cancelLabel = state?.cancelLabel || 'إلغاء';

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            {state && (
                <Modal open={Boolean(state)} onClose={() => close(false)} size="sm">
                    <div className="p-6">
                        <div className="flex items-center gap-3 text-warning-500 mb-3">
                            {state.icon ? state.icon : <AlertTriangle size={22} />}
                            <h3 className="text-lg font-bold text-white">{state.title || 'تأكيد'}</h3>
                        </div>
                        {state.message && (
                            <p className="text-slate-300 text-sm leading-relaxed mb-6">{state.message}</p>
                        )}
                        <div className="flex gap-3 justify-end">
                            <Button variant="secondary" onClick={() => close(false)}>
                                {cancelLabel}
                            </Button>
                            <Button
                                variant={variant === 'danger' ? 'danger' : 'primary'}
                                onClick={() => close(true)}
                            >
                                {confirmLabel}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </ConfirmContext.Provider>
    );
}
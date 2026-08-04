import { useState, useRef } from 'react';

export default function SettingsPage() {
    const [toast, setToast] = useState(null);
    const [confirmModal, setConfirmModal] = useState(null);
    const [busy, setBusy] = useState(false);
    const toastTimer = useRef(null);

    const showToast = (msg, type = 'error') => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToast({ msg, type });
        toastTimer.current = setTimeout(() => setToast(null), 4000);
    };

    const handleBackup = async () => {
        if (busy) return;
        setBusy(true);
        try {
            if (window.api && window.api.db && window.api.db.backupDatabase) {
                const res = await window.api.db.backupDatabase();
                if (res.canceled) { setBusy(false); return; }
                if (res.success) {
                    showToast('تم حفظ النسخة الاحتياطية بنجاح ✓', 'success');
                } else {
                    showToast('فشل النسخ الاحتياطي: ' + (res.error || ''), 'error');
                }
            } else {
                showToast('نظام قواعد البيانات غير متصل (وضع المعاينة).', 'error');
            }
        } catch (err) {
            showToast('خطأ أثناء النسخ الاحتياطي: ' + err.message, 'error');
        } finally {
            setBusy(false);
        }
    };

    const handleRestore = () => {
        if (busy) return;
        setConfirmModal({
            msg: '⚠️ سيتم استبدال جميع البيانات الحالية بالبيانات الموجودة في النسخة الاحتياطية. لا يمكن التراجع عن هذه العملية. هل تريد المتابعة؟',
            onConfirm: doRestore
        });
    };

    const doRestore = async () => {
        setBusy(true);
        try {
            if (window.api && window.api.db && window.api.db.restoreDatabase) {
                const res = await window.api.db.restoreDatabase();
                if (res.canceled) { setBusy(false); return; }
                if (res.success) {
                    // dbVersion bump handled via onDatabaseRestored event in App.jsx,
                    // which re-fetches menu/categories and reloads the dashboard.
                    showToast('تمت استعادة النسخة الاحتياطية بنجاح ✓ سيتم تحديث البيانات الآن', 'success');
                    setTimeout(() => setToast(null), 500);
                } else {
                    showToast('فشل استعادة النسخة: ' + (res.error || ''), 'error');
                }
            } else {
                showToast('نظام قواعد البيانات غير متصل (وضع المعاينة).', 'error');
            }
        } catch (err) {
            showToast('خطأ أثناء الاستعادة: ' + err.message, 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="flex-1 min-h-0 w-full bg-slate-900 text-slate-100 p-6 overflow-y-auto scrollbar-right relative" dir="rtl">
            {/* In-app Toast */}
            {toast && (
                <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-xl text-sm font-semibold text-white ${
                    toast.type === 'success' ? 'bg-emerald-600 border border-emerald-500' : 'bg-rose-600 border border-rose-500'
                }`}>
                    {toast.msg}
                </div>
            )}

            {/* In-app Confirm Modal */}
            {confirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-800 border border-slate-600 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-right" dir="rtl">
                        <p className="text-white font-semibold text-base mb-6 leading-relaxed">{confirmModal.msg}</p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setConfirmModal(null)}
                                className="px-5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-sm transition cursor-pointer"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={() => { const fn = confirmModal.onConfirm; setConfirmModal(null); fn(); }}
                                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition cursor-pointer"
                            >
                                نعم، استبدل البيانات
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-center">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full max-w-5xl items-start">
                {/* ===== Backup / Restore ===== */}
                <div className="bg-slate-800/40 border border-slate-700/55 rounded-2xl p-6 shadow-xl backdrop-blur-md">
                    <h3 className="text-xl font-black text-slate-100 flex items-center gap-2 mb-1">
                        <span className="text-emerald-400 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">💾</span>
                        النسخ الاحتياطي للبيانات
                    </h3>
                    <p className="text-slate-400 text-sm mb-5">
                        احفظ نسخة من قاعدة البيانات على جهازك، أو استعدها لاحقاً للحماية من فقدان البيانات.
                    </p>

                    {/* Backup */}
                    <div className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 mb-4">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">📤</span>
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-100 mb-1">إنشاء نسخة احتياطية</h4>
                                <p className="text-xs text-slate-400 mb-3">
                                    يفتح نافذة الحفظ لتسمية الملف واختيار مكانه على الجهاز.
                                </p>
                                <button
                                    onClick={handleBackup}
                                    disabled={busy}
                                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl transition text-sm cursor-pointer shadow shadow-emerald-950/40"
                                >
                                    {busy ? 'جاري...' : '💾 نسخ احتياطي'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Restore */}
                    <div className="bg-slate-900/50 border border-amber-500/30 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">📥</span>
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-100 mb-1">استعادة نسخة احتياطية</h4>
                                <p className="text-xs text-slate-400 mb-3">
                                    يفتح نافذة لاختيار ملف قاعدة البيانات (.db) لاستبدال كل البيانات الحالية.
                                </p>
                                <button
                                    onClick={handleRestore}
                                    disabled={busy}
                                    className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl transition text-sm cursor-pointer shadow shadow-amber-950/40"
                                >
                                    {busy ? 'جاري...' : '🔄 استعادة نسخة'}
                                </button>
                                <p className="text-[11px] text-amber-400/80 mt-3">
                                    ⚠️ تحذير: الاستعادة ستستبدل كل بيانات المخزن والرواتب والفواتير الحالية.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ===== Printer Settings (Feature 10 placeholder) ===== */}
                <div className="bg-slate-800/40 border border-dashed border-slate-600/60 rounded-2xl p-6 shadow-xl backdrop-blur-md">
                    <h3 className="text-xl font-black text-slate-100 flex items-center gap-2 mb-1">
                        <span className="text-indigo-400 bg-indigo-500/10 p-2 rounded-xl border border-indigo-500/20">🖨️</span>
                        إعدادات الطباعة
                    </h3>
                    <p className="text-slate-400 text-sm mb-5">
                        تكوين الطابعات للفواتير (قيد الإعداد — ميزة قادمة).
                    </p>
                    <div className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-5 text-center text-slate-500 text-sm">
                        سيتم إتاحة خيارات اختيار الطابعات للفواتير (العملاء + المطبخ) هنا في ميزة قادمة.
                    </div>
                </div>
            </div>
            </div>
        </div>
    );
}
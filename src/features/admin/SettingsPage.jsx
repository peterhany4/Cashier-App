import { useState } from 'react';
import icons from '../../components/icons';
import { useToast, useConfirm } from '../../components/ui';

export default function SettingsPage() {
    const toast = useToast();
    const showToast = (m, t = 'error') => toast(m, t === 'error' ? 'danger' : t);
    const confirm = useConfirm();
    const [busy, setBusy] = useState(false);

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

    const handleRestore = async () => {
        if (busy) return;
        const ok = await confirm({
            title: 'استعادة نسخة احتياطية',
            message: 'سيتم استبدال جميع البيانات الحالية بالبيانات الموجودة في النسخة الاحتياطية. لا يمكن التراجع عن هذه العملية. هل تريد المتابعة؟',
            confirmLabel: 'نعم، استبدل البيانات',
        });
        if (ok) doRestore();
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
                    showToast('تمت استعادة النسخة الاحتياطية بنجاح وسيتم تحديث البيانات الآن', 'success');
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

            <div className="flex justify-center">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full max-w-5xl items-start">
                {/* ===== Backup / Restore ===== */}
                <div className="bg-slate-800/40 border border-slate-700/55 rounded-2xl p-6 shadow-xl backdrop-blur-md">
                    <h3 className="text-xl font-black text-slate-100 flex items-center gap-2 mb-1">
                        <span className="text-emerald-400 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20"><icons.archive size={18} /></span>
                        النسخ الاحتياطي للبيانات
                    </h3>
                    <p className="text-slate-400 text-sm mb-5">
                        احفظ نسخة من قاعدة البيانات على جهازك، أو استعدها لاحقاً للحماية من فقدان البيانات.
                    </p>

                    {/* Backup */}
                    <div className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 mb-4">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl"><icons.upload size={28} /></span>
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
                                    {busy ? 'جاري...' : <> <icons.save size={16} className="inline" /> نسخ احتياطي</>}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Restore */}
                    <div className="bg-slate-900/50 border border-amber-500/30 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl"><icons.download size={28} /></span>
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
                                    {busy ? 'جاري...' : <> <icons.restore size={16} className="inline" /> استعادة نسخة</>}
                                </button>
                                <span className="text-[11px] text-amber-400/80 mt-3 flex items-center gap-1.5"><icons.warning size={13} /> تحذير: الاستعادة ستستبدل كل بيانات المخزن والرواتب والفواتير الحالية.</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ===== Printer Settings (Feature 10 placeholder) ===== */}
                <div className="bg-slate-800/40 border border-dashed border-slate-600/60 rounded-2xl p-6 shadow-xl backdrop-blur-md">
                    <h3 className="text-xl font-black text-slate-100 flex items-center gap-2 mb-1">
                        <span className="text-indigo-400 bg-indigo-500/10 p-2 rounded-xl border border-indigo-500/20"><icons.printer size={18} /></span>
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
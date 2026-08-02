import { useState, useEffect, useRef } from 'react';

export default function LoginPage({ onLoginSuccess }) {
    const [view, setView] = useState('login'); // 'login', 'reset', 'register'
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    // In-app toast (replaces native alert to avoid Electron focus loss)
    const [toast, setToast] = useState(null); // { msg, type: 'success'|'error' }
    const toastTimer = useRef(null);
    const showToast = (msg, type = 'error') => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToast({ msg, type });
        toastTimer.current = setTimeout(() => setToast(null), 3500);
    };

    // Register Admin States
    const [regUsername, setRegUsername] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regQuestion, setRegQuestion] = useState('ما هو اسم أول حيوان أليف قمت بتربيته؟');
    const [regAnswer, setRegAnswer] = useState('');

    // Reset Password States
    const [resetUsername, setResetUsername] = useState('');
    const [resetStep, setResetStep] = useState(1); // 1: input username, 2: answer question & reset
    const [fetchedQuestion, setFetchedQuestion] = useState('');
    const [securityAnswer, setSecurityAnswer] = useState('');
    const [newPassword, setNewPassword] = useState('');

    // Check if system has users on mount
    useEffect(() => {
        const checkInitialState = async () => {
            try {
                if (window.api && window.api.db) {
                    const hasUsers = await window.api.db.checkHasUsers();
                    if (!hasUsers) {
                        setView('register');
                    }
                }
            } catch (err) {
                console.error('Error checking users:', err);
            }
        };
        checkInitialState();
    }, []);

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        try {
            if (window.api && window.api.db) {
                const user = await window.api.db.loginUser(username, password);
                onLoginSuccess(user);
            } else {
                // Fallback for browser tests if window.api is undefined
                if (username === 'admin' && password === 'admin') {
                    onLoginSuccess({ username: 'المدير', role: 'admin' });
                } else if (username === 'user' && password === 'user') {
                    onLoginSuccess({ username: 'الموظف', role: 'employee' });
                } else {
                    showToast('اسم المستخدم أو كلمة المرور غير صحيحة');
                }
            }
        } catch (err) {
            showToast(err.message || 'فشل تسجيل الدخول');
        }
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        try {
            if (window.api && window.api.db) {
                const res = await window.api.db.registerUser(
                    regUsername,
                    regPassword,
                    'admin',
                    regQuestion,
                    regAnswer
                );
                if (res.success) {
                    // Switch to login first, THEN show toast — avoids native dialog focus loss
                    setView('login');
                    showToast('تم إنشاء الحساب بنجاح! الرجاء تسجيل الدخول.', 'success');
                } else {
                    showToast('خطأ أثناء التسجيل: ' + res.error);
                }
            } else {
                showToast('نظام قواعد البيانات غير متصل.');
            }
        } catch (err) {
            showToast(err.message || 'فشل التسجيل');
        }
    };

    const handleResetCheckUsername = async (e) => {
        e.preventDefault();
        try {
            if (window.api && window.api.db) {
                const question = await window.api.db.getSecurityQuestion(resetUsername);
                setFetchedQuestion(question);
                setResetStep(2);
            } else {
                showToast('نظام قواعد البيانات غير متصل.');
            }
        } catch (err) {
            showToast(err.message || 'اسم المستخدم غير موجود');
        }
    };

    const handleResetSubmit = async (e) => {
        e.preventDefault();
        try {
            if (window.api && window.api.db) {
                const res = await window.api.db.resetPassword(resetUsername, securityAnswer, newPassword);
                if (res.success) {
                    setView('login');
                    showToast('تمت إعادة تعيين كلمة المرور بنجاح! الرجاء تسجيل الدخول.', 'success');
                    setResetUsername('');
                    setSecurityAnswer('');
                    setNewPassword('');
                    setResetStep(1);
                }
            } else {
                showToast('نظام قواعد البيانات غير متصل.');
            }
        } catch (err) {
            showToast(err.message || 'الإجابة غير صحيحة، فشل إعادة تعيين كلمة المرور');
        }
    };

    return (
        <div
            className="min-h-screen w-full overflow-hidden bg-slate-900 flex flex-col justify-center items-center px-4"
            dir="rtl"
        >
            {/* In-app Toast — replaces native alert() to keep window focus */}
            {toast && (
                <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-xl text-sm font-semibold text-white transition-all ${
                    toast.type === 'success'
                        ? 'bg-emerald-600 border border-emerald-500'
                        : 'bg-rose-600 border border-rose-500'
                }`}>
                    {toast.msg}
                </div>
            )}

            <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white tracking-wide">
                        نظام الكاشير
                    </h1>
                    <p className="text-slate-400 mt-2 text-sm">
                        {view === 'register' 
                            ? 'إعداد مسؤول النظام لأول مرة' 
                            : view === 'reset' 
                            ? 'استعادة كلمة المرور' 
                            : 'الرجاء تسجيل الدخول للمتابعة'}
                    </p>
                </div>

                {view === 'login' && (
                    /* --- نموذج تسجيل الدخول --- */
                    <form onSubmit={handleLoginSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                اسم المستخدم
                            </label>
                            <input
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-right"
                                placeholder="أدخل اسم المستخدم"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-sm font-medium text-slate-300">
                                    كلمة المرور
                                </label>
                            </div>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-right"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => { setView('reset'); setResetStep(1); }}
                                className="text-xs text-emerald-400 hover:underline mt-2 cursor-pointer"
                            >
                                نسيت كلمة المرور؟
                            </button>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3.5 rounded-xl transition shadow-lg shadow-emerald-900/30 cursor-pointer"
                        >
                            تسجيل الدخول
                        </button>
                    </form>
                )}

                {view === 'register' && (
                    /* --- نموذج إنشاء المدير الرئيسي (أول تشغيل) --- */
                    <form onSubmit={handleRegisterSubmit} className="space-y-4">
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-xs text-emerald-300 text-center mb-2">
                            ⚠️ لم يتم العثور على حسابات في النظام. الرجاء تعيين بيانات المسؤول الأول للبدء.
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">
                                اسم المستخدم للمسؤول
                            </label>
                            <input
                                type="text"
                                required
                                value={regUsername}
                                onChange={(e) => setRegUsername(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-right text-sm"
                                placeholder="مثال: admin"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">
                                كلمة المرور
                            </label>
                            <input
                                type="password"
                                required
                                value={regPassword}
                                onChange={(e) => setRegPassword(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-right text-sm"
                                placeholder="••••••••"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">
                                اختر سؤال الأمان
                            </label>
                            <select
                                value={regQuestion}
                                onChange={(e) => setRegQuestion(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-right text-sm"
                            >
                                <option value="ما هو اسم أول حيوان أليف قمت بتربيته؟">ما هو اسم أول حيوان أليف قمت بتربيته؟</option>
                                <option value="ما هو اسم أول مدرسة درست بها؟">ما هو اسم أول مدرسة درست بها؟</option>
                                <option value="ما هو اسم المدينة التي ولدت بها؟">ما هو اسم المدينة التي ولدت بها؟</option>
                                <option value="ما هي وظيفه أحلامك في الطفولة؟">ما هي وظيفه أحلامك في الطفولة؟</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">
                                إجابة سؤال الأمان
                            </label>
                            <input
                                type="text"
                                required
                                value={regAnswer}
                                onChange={(e) => setRegAnswer(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-right text-sm"
                                placeholder="اكتب إجابة السؤال بدقة"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl transition shadow-lg shadow-emerald-900/30 cursor-pointer text-sm"
                        >
                            تأكيد وتسجيل الحساب المسؤول
                        </button>
                    </form>
                )}

                {view === 'reset' && (
                    /* --- نموذج استعادة كلمة المرور --- */
                    <form onSubmit={resetStep === 1 ? handleResetCheckUsername : handleResetSubmit} className="space-y-6">
                        {resetStep === 1 ? (
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    اسم المستخدم المراد استرجاعه
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={resetUsername}
                                    onChange={(e) => setResetUsername(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-right"
                                    placeholder="أدخل اسم المستخدم"
                                />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 text-right">
                                    <span className="block text-xs text-slate-400 font-bold mb-1">سؤال الأمان المسجل:</span>
                                    <span className="text-sm text-slate-200 font-semibold">{fetchedQuestion}</span>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                        إجابة سؤال الأمان
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={securityAnswer}
                                        onChange={(e) => setSecurityAnswer(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-right"
                                        placeholder="أدخل الإجابة"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                        كلمة المرور الجديدة
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-right"
                                        placeholder="أدخل كلمة المرور الجديدة"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex gap-4">
                            <button
                                type="submit"
                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl transition cursor-pointer text-sm"
                            >
                                {resetStep === 1 ? 'تحقق من الحساب' : 'إعادة تعيين كلمة المرور'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setView('login')}
                                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl transition cursor-pointer text-sm"
                            >
                                إلغاء
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
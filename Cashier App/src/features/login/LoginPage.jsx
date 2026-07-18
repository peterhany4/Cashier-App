import { useState } from 'react';

export default function LoginPage({ onLoginSuccess }) {
    const [view, setView] = useState('login'); // 'login' أو 'reset'
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [resetUsername, setResetUsername] = useState('');
    const [securityAnswer, setSecurityAnswer] = useState('');

    const handleLoginSubmit = (e) => {
        e.preventDefault();
        // تسجيل دخول تجريبي مؤقت للتطوير
        if (username === 'admin' && password === 'admin') {
            onLoginSuccess({ username: 'المدير', role: 'admin' });
        } else if (username === 'user' && password === 'user') {
            onLoginSuccess({ username: 'الموظف', role: 'employee' });
        } else {
            alert('اسم المستخدم أو كلمة المرور غير صحيحة');
        }
    };

    const handleResetSubmit = (e) => {
        e.preventDefault();
        alert('تم إرسال طلب إعادة تعيين كلمة المرور للمسؤول');
        setView('login');
    };

    return (
        <div
            className="min-h-screen bg-slate-900 flex flex-col justify-center items-center px-4"
            dir="rtl"
        >
            <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white tracking-wide">
                        نظام الكاشير الذكي
                    </h1>
                    <p className="text-slate-400 mt-2 text-sm">
                        الرجاء تسجيل الدخول للمتابعة
                    </p>
                </div>

                {view === 'login' ? (
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
                                placeholder="أدخل اسم المستخدم (admin أو user)"
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
                                onClick={() => setView('reset')}
                                className="text-xs text-emerald-400 hover:underline"
                            >
                                نسيت كلمة المرور؟
                            </button>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3.5 rounded-xl transition shadow-lg shadow-emerald-900/30"
                        >
                            تسجيل الدخول
                        </button>
                    </form>
                ) : (
                    /* --- نموذج استعادة كلمة المرور --- */
                    <form onSubmit={handleResetSubmit} className="space-y-6">
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

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                اسم أول مدرسة درست بها؟ (سؤال أمان)
                            </label>
                            <input
                                type="text"
                                required
                                value={securityAnswer}
                                onChange={(e) => setSecurityAnswer(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-right"
                            />
                        </div>

                        <div className="flex gap-4">
                            <button
                                type="submit"
                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl transition"
                            >
                                إرسال طلب
                            </button>
                            <button
                                type="button"
                                onClick={() => setView('login')}
                                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl transition"
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
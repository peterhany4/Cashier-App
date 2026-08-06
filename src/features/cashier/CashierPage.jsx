import { useState, useRef } from 'react';
import { useCart } from '../../context/CartContext';

export default function CashierPage({ user, menu = [], categories = [] }) {
    const [activeCategory, setActiveCategory] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Sync active category to the first category once the list arrives
    if (activeCategory === null && categories.length > 0) {
        setActiveCategory(categories[0].name);
    }

    const { cart, addToCart, removeFromCart, clearCart, getSubtotal } = useCart();

    // In-app toast — replaces native alert() to keep Electron window focus
    const [toast, setToast] = useState(null);
    const toastTimer = useRef(null);
    const showToast = (msg, type = 'error') => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToast({ msg, type });
        toastTimer.current = setTimeout(() => setToast(null), 3500);
    };

    const isSearching = searchQuery.trim().length > 0;
    const filteredMenu = isSearching
        ? menu.filter(item => item.name.toLowerCase().includes(searchQuery.trim().toLowerCase()))
        : menu.filter(item => item.category === activeCategory);

    const subtotal = getSubtotal();
    const total = subtotal;

    const handleCheckout = async (shouldPrint) => {
        if (cart.length === 0) {
            showToast('السلة فارغة! الرجاء إضافة عناصر أولاً.');
            return;
        }

        try {
            const cashierName = user?.username || 'كاشير عام';
            if (window.api && window.api.db) {
                const orderData = cart.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price
                }));
                await window.api.db.createOrder(cashierName, total, orderData);
            }

            if (shouldPrint) {
                showToast(`تم الحفظ وإرسال الطلب للطباعة ✓  الإجمالي: ${total.toFixed(2)} جنية`, 'success');
            } else {
                showToast(`تم حفظ الطلب بنجاح ✓  الإجمالي: ${total.toFixed(2)} جنية`, 'success');
            }
            clearCart();
        } catch (err) {
            showToast('خطأ أثناء حفظ الفاتورة: ' + err.message);
        }
    };

    return (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
            {/* In-app Toast */}
            {toast && (
                <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-xl text-sm font-semibold text-white ${
                    toast.type === 'success' ? 'bg-emerald-600 border border-emerald-500' : 'bg-rose-600 border border-rose-500'
                }`}>
                    {toast.msg}
                </div>
            )}

            {/* Main Content Row — reserves space for the fixed checkout bar */}
            <div className="flex-1 min-h-0 flex overflow-hidden pb-20">
                {/* RIGHT SIDE: Menu & Tabs (Takes up 65% space) */}
                <div className="w-[65%] flex flex-col min-h-0">
                    {/* Search + Category Tabs — fixed, always visible */}
                    <div className="shrink-0 px-4 py-3 space-y-3 border-b border-slate-700/50">
                        {/* Search Bar */}
                        <div className="flex items-center gap-3">
                            <div className="relative flex-1">
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="ابحث عن صنف بالاسم..."
                                    className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 rounded-xl pl-4 pr-11 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none transition"
                                />
                                {isSearching && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-sm cursor-pointer transition"
                                        title="مسح البحث"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                            {isSearching && (
                                <span className="text-xs text-emerald-400 font-bold whitespace-nowrap">
                                    {filteredMenu.length} نتيجة من {menu.length}
                                </span>
                            )}
                        </div>

                        {/* Category Tabs */}
                        <div className="flex gap-2 flex-wrap">
                            {categories.map(category => (
                                <button
                                    key={category.id}
                                    onClick={() => setActiveCategory(category.name)}
                                    className={`py-2.5 px-4 text-sm font-bold rounded-xl border transition-all duration-200 ${activeCategory === category.name
                                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-950/50'
                                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                                        }`}
                                >
                                    {category.name}
                                </button>
                            ))}
                            {categories.length === 0 && (
                                <div className="text-slate-500 text-sm py-4">لا توجد فئات. أضف فئات من لوحة التحكم أولاً.</div>
                            )}
                        </div>
                    </div>

                    {/* Items area — the ONLY thing that scrolls, with a visible scrollbar */}
                    <div className="flex-1 min-h-0 overflow-y-auto scrollbar-right items-scroll px-4 py-4">
                        <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                            {filteredMenu.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => addToCart(item)}
                                    className="bg-slate-800 border border-slate-700 hover:border-emerald-500 rounded-xl p-3.5 flex flex-col justify-between items-start text-right transition group h-28 shadow-sm"
                                >
                                    <span className="text-base font-bold text-slate-100 group-hover:text-emerald-300 transition-colors leading-snug line-clamp-2">
                                        {item.name}
                                    </span>
                                    <div className="w-full flex justify-between items-center mt-2">
                                        <span className="text-base font-extrabold text-emerald-400">{item.price} جنية</span>
                                        <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-lg text-xs font-bold border border-emerald-500/20">
                                            إضافة +
                                        </span>
                                    </div>
                                </button>
                            ))}
                            {filteredMenu.length === 0 && (
                                <div className="col-span-2 xl:col-span-3 py-16 text-center text-slate-500 bg-slate-800/40 rounded-2xl border border-slate-700/40">
                                    {isSearching
                                        ? `لا توجد نتائج تطابق "${searchQuery}".`
                                        : 'لا توجد أصناف في هذه الفئة.'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* LEFT SIDE: Active Order Receipt Panel (Takes up 35% space) */}
                <div className="w-[35%] bg-surface-1 border-r border-slate-700 flex flex-col shadow-2xl">
                    <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                        <h2 className="text-lg font-black text-slate-200">الطلب الحالي</h2>
                        {cart.length > 0 && (
                            <button onClick={clearCart} className="text-rose-400 hover:text-rose-300 text-sm cursor-pointer">
                                مسح السلة
                            </button>
                        )}
                    </div>

                    {/* Cart Items List */}
                    <div className="flex-1 min-h-0 overflow-y-auto scrollbar-right p-4 space-y-3">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col justify-center items-center text-slate-500">
                                <span className="text-4xl mb-2">🛒</span>
                                <p>السلة فارغة. ابدأ بإضافة وجبات</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.id} className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 flex justify-between items-center">
                                    <div>
                                        <h4 className="font-bold text-sm text-slate-200">{item.name}</h4>
                                        <span className="text-xs text-slate-400">{item.price} جنية × {item.quantity}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => removeFromCart(item.id)}
                                            className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold w-8 h-8 rounded-lg flex items-center justify-center transition cursor-pointer"
                                        >
                                            -
                                        </button>
                                        <span className="font-bold text-sm min-w-4 text-center">{item.quantity}</span>
                                        <button
                                            onClick={() => addToCart(item)}
                                            className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold w-8 h-8 rounded-lg flex items-center justify-center transition cursor-pointer"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* FIXED BOTTOM CHECKOUT BAR — always glued to the bottom of the window, never scrolled away */}
            <div className="fixed bottom-0 inset-x-0 z-30 bg-slate-800 border-t border-slate-700 px-5 py-3 flex items-center justify-between gap-4 shadow-2xl">
                <div>
                    <div className="text-xs text-slate-400 font-bold">
                        الإجمالي الكلي {cart.length > 0 ? `(${cart.reduce((n, it) => n + it.quantity, 0)} صنف)` : ''}
                    </div>
                    <div className="text-2xl font-black text-emerald-400">{total.toFixed(2)} جنية</div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => handleCheckout(false)}
                        className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-6 py-3 rounded-xl transition text-sm shadow cursor-pointer"
                    >
                        حفظ فقط (بدون طباعة)
                    </button>
                    <button
                        onClick={() => handleCheckout(true)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-xl transition text-sm shadow shadow-emerald-900/30 cursor-pointer"
                    >
                        حفظ وطباعة الفاتورة 🖨️
                    </button>
                </div>
            </div>
        </div>
    );
}
import { useState } from 'react';
import { useCart } from '../../context/CartContext';

const CATEGORIES = [
    { id: 'mains', label: 'وجبات رئيسية' },
    { id: 'sides', label: 'مقبلات جانبية' },
    { id: 'drinks', label: 'مشروبات باردة' },
];

export default function CashierPage({ menu = [] }) {
    const [activeCategory, setActiveCategory] = useState('mains');
    const { cart, addToCart, removeFromCart, clearCart, getSubtotal } = useCart();

    const filteredMenu = menu.filter(item => item.category === activeCategory);

    const subtotal = getSubtotal();
    const total = subtotal;

    const handleCheckout = (shouldPrint) => {
        if (cart.length === 0) {
            alert('السلة فارغة! الرجاء إضافة عناصر أولاً.');
            return;
        }

        if (shouldPrint) {
            alert(`جاري حفظ الطلب وطباعة الفاتورة للعميل والمطبخ...\nالإجمالي: ${total.toFixed(2)} جنية`);
        } else {
            alert(`تم حفظ الطلب محلياً بنجاح (بدون طباعة).\nالإجمالي: ${total.toFixed(2)} جنية`);
        }
        clearCart();
    };

    return (
        <div className="flex-1 flex overflow-hidden">
            {/* RIGHT SIDE: Menu & Tabs (Takes up 65% space) */}
            <div className="w-[65%] p-6 flex flex-col gap-6 overflow-y-auto">
                {/* Category Tabs */}
                <div className="flex gap-3">
                    {CATEGORIES.map(category => (
                        <button
                            key={category.id}
                            onClick={() => setActiveCategory(category.id)}
                            className={`flex-1 py-4 px-6 text-lg font-bold rounded-xl border transition-all duration-200 ${activeCategory === category.id
                                ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-950/50'
                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                                }`}
                        >
                            {category.label}
                        </button>
                    ))}
                </div>

                {/* Items Grid */}
                <div className="grid grid-cols-3 gap-4">
                    {filteredMenu.map(item => (
                        <button
                            key={item.id}
                            onClick={() => addToCart(item)}
                            className="bg-slate-800 border border-slate-700 hover:border-emerald-500 rounded-2xl p-5 flex flex-col justify-between items-start text-right transition group h-40 shadow-sm"
                        >
                            <span className="text-xl font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
                                {item.name}
                            </span>
                            <div className="w-full flex justify-between items-end mt-4">
                                <span className="text-lg font-extrabold text-emerald-400">{item.price} جنية</span>
                                <span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-500/20">
                                    إضافة +
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* LEFT SIDE: Active Order Receipt Panel (Takes up 35% space) */}
            <div className="w-[35%] bg-slate-850 border-r border-slate-700 flex flex-col shadow-2xl">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                    <h2 className="text-lg font-black text-slate-200">الطلب الحالي</h2>
                    {cart.length > 0 && (
                        <button onClick={clearCart} className="text-rose-400 hover:text-rose-300 text-sm">
                            مسح السلة
                        </button>
                    )}
                </div>

                {/* Cart Items List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                                        className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold w-8 h-8 rounded-lg flex items-center justify-center transition"
                                    >
                                        -
                                    </button>
                                    <span className="font-bold text-sm min-w-4 text-center">{item.quantity}</span>
                                    <button
                                        onClick={() => addToCart(item)}
                                        className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold w-8 h-8 rounded-lg flex items-center justify-center transition"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Calculations & Actions */}
                <div className="p-4 bg-slate-800 border-t border-slate-700 space-y-4">
                    <div className="space-y-2 text-sm text-slate-300">
                        <div className="flex justify-between text-lg font-black text-white pt-2 border-t border-slate-700">
                            <span>الإجمالي الكلي:</span>
                            <span className="text-emerald-400">{total.toFixed(2)} جنية</span>
                        </div>
                    </div>

                    {/* Print/No Print Decision Buttons */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                            onClick={() => handleCheckout(false)}
                            className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-2 rounded-xl transition text-xs shadow"
                        >
                            حفظ فقط (بدون طباعة)
                        </button>
                        <button
                            onClick={() => handleCheckout(true)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-2 rounded-xl transition text-xs shadow shadow-emerald-900/30"
                        >
                            حفظ وطباعة الفاتورة 🖨️
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
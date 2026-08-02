import { useState, useEffect, useRef } from 'react';

export default function CashierReceiptsPage({ user }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedOrder, setExpandedOrder] = useState(null);

    // Toast state
    const [toast, setToast] = useState(null);
    const toastTimer = useRef(null);
    const showToast = (msg, type = 'error') => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToast({ msg, type });
        toastTimer.current = setTimeout(() => setToast(null), 3500);
    };

    // Confirm Modal state
    const [confirmModal, setConfirmModal] = useState(null);
    const showConfirm = (msg, onConfirm) => setConfirmModal({ msg, onConfirm });

    // Load cashier's orders for today only (resets clean every midnight)
    useEffect(() => {
        let isMounted = true;
        const fetchOrders = async () => {
            if (window.api && window.api.db) {
                try {
                    const dbOrders = await window.api.db.getOrders();
                    const todayStr = new Date().toDateString();
                    // Filter orders belonging to current cashier for TODAY only
                    const myTodayOrders = dbOrders.filter(order => {
                        if (!order.cashier || !user?.username) return false;
                        if (order.cashier.toLowerCase() !== user.username.toLowerCase()) return false;
                        if (!order.timestamp) return false;
                        return new Date(order.timestamp).toDateString() === todayStr;
                    });
                    if (isMounted) setOrders(myTodayOrders);
                } catch (err) {
                    console.error('Error fetching orders:', err);
                    if (isMounted) showToast('خطأ أثناء تحميل سجل الفواتير');
                } finally {
                    if (isMounted) setLoading(false);
                }
            } else {
                if (isMounted) setLoading(false);
            }
        };

        fetchOrders();
        return () => { isMounted = false; };
    }, [user?.username]);

    const handleDeleteOrder = (order, displayIndex) => {
        showConfirm(`هل أنت متأكد من حذف الفاتورة رقم #${displayIndex} (بقيمة ${order.total.toFixed(2)} جنية)؟ لا يمكن التراجع عن هذا الإجراء.`, async () => {
            try {
                if (window.api && window.api.db) {
                    await window.api.db.deleteOrder(order.id);
                }
                setOrders(prev => prev.filter(o => o.id !== order.id));
                showToast(`تم حذف الفاتورة رقم #${displayIndex} بنجاح ✓`, 'success');
            } catch (err) {
                console.error('Error deleting order:', err);
                showToast('حدث خطأ أثناء حذف الفاتورة: ' + err.message);
            }
        });
    };

    // Filtered orders based on search query
    const filteredOrders = orders.filter(order => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return true;
        const dailyNumStr = (order.daily_number || order.id).toString();
        return (
            dailyNumStr.includes(query) ||
            order.id.toString().includes(query) ||
            order.items?.some(item => item.item_name.toLowerCase().includes(query))
        );
    });

    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);

    return (
        <div className="flex-1 p-6 overflow-y-auto scrollbar-right bg-slate-900 text-white relative" dir="rtl">
            {/* In-App Toast */}
            {toast && (
                <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-xl text-sm font-semibold text-white transition-all ${
                    toast.type === 'success' ? 'bg-emerald-600 border border-emerald-500' : 'bg-rose-600 border border-rose-500'
                }`}>
                    {toast.msg}
                </div>
            )}

            {/* In-App Confirm Modal */}
            {confirmModal && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
                        <div className="flex items-center gap-3 text-amber-400">
                            <span className="text-2xl">⚠️</span>
                            <h3 className="text-lg font-bold text-white">تأكيد الحذف</h3>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed">{confirmModal.msg}</p>
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setConfirmModal(null)}
                                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-650 text-slate-300 font-bold text-sm transition cursor-pointer"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={() => {
                                    confirmModal.onConfirm();
                                    setConfirmModal(null);
                                }}
                                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition cursor-pointer shadow shadow-rose-950/40"
                            >
                                نعم، حذف الفاتورة
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header & Stats Strip */}
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
                    <div>
                        <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
                            <span className="text-emerald-400">🧾</span> سجل فواتيري (اليوم)
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                            استعراض وإدارة الفواتير التي قمت بإصدارها اليوم باسم ({user?.username})
                        </p>
                    </div>

                    <input
                        type="text"
                        placeholder="ابحث برقم الفاتورة أو اسم الوجبة..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-right w-full sm:w-72"
                    />
                </div>

                {/* KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-slate-400 font-bold">فواتيرك اليوم</p>
                            <h4 className="text-2xl font-black text-white font-mono mt-1">{orders.length}</h4>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xl font-bold">
                            📄
                        </div>
                    </div>

                    <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-slate-400 font-bold">مجموع مبيعاتك اليوم</p>
                            <h4 className="text-2xl font-black text-emerald-400 font-mono mt-1">
                                {totalRevenue.toFixed(2)} <span className="text-xs text-slate-400 font-normal">جنية</span>
                            </h4>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xl font-bold">
                            💰
                        </div>
                    </div>
                </div>

                {/* Receipts Table */}
                <div className="bg-slate-800 border border-slate-700/60 rounded-2xl overflow-hidden shadow-md">
                    <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                            <thead>
                                <tr className="bg-slate-750 text-slate-300 border-b border-slate-700 text-sm">
                                    <th className="p-4 font-bold">#</th>
                                    <th className="p-4 font-bold text-center">التاريخ والوقت</th>
                                    <th className="p-4 font-bold text-center">الإجمالي</th>
                                    <th className="p-4 font-bold text-center">الأصناف</th>
                                    <th className="p-4 font-bold text-center">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/40 text-sm">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="text-center p-8 text-slate-400">جاري تحميل الفواتير...</td>
                                    </tr>
                                ) : filteredOrders.map((order, index) => {
                                    const isExpanded = expandedOrder === order.id;
                                    const displayIndex = index + 1;
                                    return (
                                        <tr key={order.id} className="hover:bg-slate-750/40 transition-colors">
                                            <td className="p-4 font-bold text-white font-mono">#{displayIndex}</td>
                                            <td className="p-4 text-center font-mono text-slate-400 text-xs">
                                                {new Date(order.timestamp).toLocaleString('ar-EG', { hour12: true })}
                                            </td>
                                            <td className="p-4 text-center font-extrabold text-emerald-400 font-mono text-base">
                                                {order.total.toFixed(2)} جنية
                                            </td>
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                                                    className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 px-3 py-1.5 rounded-lg text-xs transition font-bold cursor-pointer"
                                                >
                                                    {isExpanded ? 'إخفاء التفاصيل ⬆️' : 'عرض الأصناف ⬇️'}
                                                </button>

                                                {isExpanded && (
                                                    <div className="bg-slate-900 border border-slate-700/70 rounded-xl p-3 mt-2 text-right text-xs space-y-2 max-w-sm mx-auto animate-fadeIn">
                                                        <div className="font-bold border-b border-slate-700 pb-1 text-slate-300">أصناف الفاتورة:</div>
                                                        {order.items?.map((item, idx) => (
                                                            <div key={idx} className="flex justify-between text-slate-400 gap-4">
                                                                <span>{item.item_name} × {item.quantity}</span>
                                                                <span className="font-mono text-slate-300">{(item.price * item.quantity).toFixed(2)} جنية</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => handleDeleteOrder(order, displayIndex)}
                                                    className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold px-3 py-1.5 rounded-xl transition text-xs cursor-pointer flex items-center gap-1 mx-auto"
                                                    title="حذف الفاتورة"
                                                >
                                                    <span>🗑️</span>
                                                    <span>حذف</span>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {!loading && filteredOrders.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="text-center p-8 text-slate-500">
                                            {orders.length === 0 ? 'لم تقم بإصدار أي فواتير حتى الآن.' : 'لا توجد فواتير تطابق بحثك.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

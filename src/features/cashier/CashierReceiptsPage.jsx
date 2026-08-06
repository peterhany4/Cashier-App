import { useState, useEffect, useCallback } from 'react';
import icons from '../../components/icons';
import { useToast, useConfirm } from '../../components/ui';

export default function CashierReceiptsPage({ user }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedOrder, setExpandedOrder] = useState(null);

    // Shared in-app toast + confirm
    const toast = useToast();
    const showToast = useCallback((message, type = 'danger') => toast(message, type), [toast]);
    const confirm = useConfirm();

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
    }, [user?.username, showToast]);

    const handleDeleteOrder = async (order, displayIndex) => {
        const ok = await confirm({
            title: 'تأكيد الحذف',
            message: `هل أنت متأكد من حذف الفاتورة رقم #${displayIndex} (بقيمة ${order.total.toFixed(2)} جنية)؟ لا يمكن التراجع عن هذا الإجراء.`,
            confirmLabel: 'نعم، حذف الفاتورة',
        });
        if (!ok) return;
        try {
            if (window.api && window.api.db) {
                await window.api.db.deleteOrder(order.id);
            }
            setOrders(prev => prev.filter(o => o.id !== order.id));
            showToast(`تم حذف الفاتورة رقم #${displayIndex} بنجاح`, 'success');
        } catch (err) {
            console.error('Error deleting order:', err);
            showToast('حدث خطأ أثناء حذف الفاتورة: ' + err.message);
        }
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
        <div className="flex-1 p-6 overflow-y-auto scrollbar-right app-bg text-ink relative" dir="rtl">

            {/* Header & Stats Strip */}
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
                    <div>
                        <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
                            <span className="text-emerald-700"><icons.receipt size={22} /></span> سجل فواتيري (اليوم)
                        </h2>
                        <p className="text-xs text-slate-600 mt-1">
                            استعراض وإدارة الفواتير التي قمت بإصدارها اليوم باسم ({user?.username})
                        </p>
                    </div>

                    <input
                        type="text"
                        placeholder="ابحث برقم الفاتورة أو اسم الوجبة..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-surface-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-right w-full sm:w-72"
                    />
                </div>

                {/* KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-surface-1/80 border border-slate-200/60 rounded-2xl p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-slate-600 font-bold">فواتيرك اليوم</p>
                            <h4 className="text-2xl font-black text-ink font-mono mt-1">{orders.length}</h4>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-700 text-xl font-bold"><icons.clipboard size={24} /></div>
                    </div>

                    <div className="bg-surface-1/80 border border-slate-200/60 rounded-2xl p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-slate-600 font-bold">مجموع مبيعاتك اليوم</p>
                            <h4 className="text-2xl font-black text-emerald-700 font-mono mt-1">
                                {totalRevenue.toFixed(2)} <span className="text-xs text-slate-600 font-normal">جنية</span>
                            </h4>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-700 text-xl font-bold"><icons.cash size={24} /></div>
                    </div>
                </div>

                {/* Receipts Table */}
                <div className="bg-surface-1 border border-slate-200/60 rounded-2xl overflow-hidden shadow-md">
                    <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                            <thead>
                                <tr className="bg-surface-3 text-slate-600 border-b border-slate-200 text-sm">
                                    <th className="p-4 font-bold">#</th>
                                    <th className="p-4 font-bold text-center">التاريخ والوقت</th>
                                    <th className="p-4 font-bold text-center">الإجمالي</th>
                                    <th className="p-4 font-bold text-center">الأصناف</th>
                                    <th className="p-4 font-bold text-center">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/70 text-sm">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="text-center p-8 text-slate-600">جاري تحميل الفواتير...</td>
                                    </tr>
                                ) : filteredOrders.map((order, index) => {
                                    const isExpanded = expandedOrder === order.id;
                                    const displayIndex = index + 1;
                                    return (
                                        <tr key={order.id} className="hover:bg-surface-3/40 transition-colors">
                                            <td className="p-4 font-bold text-ink font-mono">#{displayIndex}</td>
                                            <td className="p-4 text-center font-mono text-slate-600 text-xs">
                                                {new Date(order.timestamp).toLocaleString('ar-EG', { hour12: true })}
                                            </td>
                                            <td className="p-4 text-center font-extrabold text-emerald-700 font-mono text-base">
                                                {order.total.toFixed(2)} جنية
                                            </td>
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                                                    className="text-emerald-700 hover:text-emerald-300 hover:bg-emerald-500/10 px-3 py-1.5 rounded-lg text-xs transition font-bold cursor-pointer"
                                                >
                                                    {isExpanded
                                                        ? <>إخفاء التفاصيل <icons.chevronUp size={14} className="inline" /></>
                                                        : <>عرض الأصناف <icons.chevronDown size={14} className="inline" /></>}
                                                </button>

                                                {isExpanded && (
                                                    <div className="bg-slate-900 border border-slate-200/70 rounded-xl p-3 mt-2 text-right text-xs space-y-2 max-w-sm mx-auto animate-fadeIn">
                                                        <div className="font-bold border-b border-slate-200 pb-1 text-slate-600">أصناف الفاتورة:</div>
                                                        {order.items?.map((item, idx) => (
                                                            <div key={idx} className="flex justify-between text-slate-600 gap-4">
                                                                <span>{item.item_name} × {item.quantity}</span>
                                                                <span className="font-mono text-slate-600">{(item.price * item.quantity).toFixed(2)} جنية</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => handleDeleteOrder(order, displayIndex)}
                                                    className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/30 font-bold px-3 py-1.5 rounded-xl transition text-xs cursor-pointer flex items-center gap-1 mx-auto"
                                                    title="حذف الفاتورة"
                                                >
                                                    <span><icons.trash size={14} className="inline" /></span>
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

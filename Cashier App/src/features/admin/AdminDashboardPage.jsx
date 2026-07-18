import { useState } from 'react';

export default function AdminDashboardPage({ user, menu, setMenu }) {
    // 2. Active Tab State ('menu', 'inventory', 'salaries')
    const [activeTab, setActiveTab] = useState('menu');

    // --- State: Inventory ---
    const [inventory, setInventory] = useState([
        { id: 1, name: 'خبز شاورما طازج', quantity: 120, unit: 'قطعة', lowThreshold: 35 },
        { id: 2, name: 'لحم عجل مبرد (شاورما)', quantity: 25, unit: 'كجم', lowThreshold: 8 },
        { id: 3, name: 'صدور دجاج طازجة', quantity: 42, unit: 'كجم', lowThreshold: 10 },
        { id: 4, name: 'بطاطس بلدي للتحمير', quantity: 50, unit: 'كجم', lowThreshold: 15 },
        { id: 5, name: 'زيت ذرة نقي للقلي', quantity: 18, unit: 'لتر', lowThreshold: 6 },
        { id: 6, name: 'طماطم طازجة للسلطة', quantity: 5, unit: 'كجم', lowThreshold: 10 } // Low stock seeded
    ]);

    // --- State: Employees & Salaries ---
    const [employees, setEmployees] = useState([
        { id: 1, name: 'أحمد محمود سليمان', role: 'كاشير ومسؤول صندوق', baseSalary: 4500, bonuses: 250, deductions: 50, paymentStatus: 'paid', lastPaymentDate: '2026-07-01' },
        { id: 2, name: 'ياسر الشيف علي', role: 'كبير طهاة شاورما', baseSalary: 8500, bonuses: 600, deductions: 0, paymentStatus: 'pending', lastPaymentDate: '2026-06-30' },
        { id: 3, name: 'حسن عمر متولي', role: 'مساعد طاهي ومجهز', baseSalary: 5200, bonuses: 150, deductions: 100, paymentStatus: 'paid', lastPaymentDate: '2026-07-01' },
        { id: 4, name: 'نور الدين مصطفى', role: 'مشرف نظافة وصيانة', baseSalary: 3800, bonuses: 0, deductions: 0, paymentStatus: 'pending', lastPaymentDate: '2026-06-28' }
    ]);

    // --- Form Inputs States ---
    // Menu item form
    const [newItemName, setNewItemName] = useState('');
    const [newItemPrice, setNewItemPrice] = useState('');
    const [newItemCategory, setNewItemCategory] = useState('mains');
    const [menuSearch, setMenuSearch] = useState('');

    // Inventory form
    const [newInvName, setNewInvName] = useState('');
    const [newInvQty, setNewInvQty] = useState('');
    const [newInvUnit, setNewInvUnit] = useState('كجم');
    const [newInvThreshold, setNewInvThreshold] = useState('');
    const [showAddInvForm, setShowAddInvForm] = useState(false);

    // Employee form
    const [newEmpName, setNewEmpName] = useState('');
    const [newEmpRole, setNewEmpRole] = useState('');
    const [newEmpBase, setNewEmpBase] = useState('');
    const [showAddEmpForm, setShowAddEmpForm] = useState(false);

    // 1. Auth Guard Checklist
    if (!user || user.role !== 'admin') {
        return (
            <div className="flex-1 flex flex-col justify-center items-center bg-slate-900 text-white p-6" dir="rtl">
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-8 max-w-md text-center shadow-lg">
                    <span className="text-5xl mb-4 block">⚠️</span>
                    <h2 className="text-2xl font-black text-rose-400 mb-2">وصول غير مصرح به</h2>
                    <p className="text-slate-300">عذراً، ليس لديك الصلاحيات الكافية للوصول إلى لوحة التحكم.</p>
                </div>
            </div>
        );
    }

    // --- Handler Functions: Menu ---
    const handleAddMenuItem = (e) => {
        e.preventDefault();
        if (!newItemName || !newItemPrice) return;
        const newItem = {
            id: Date.now(),
            name: newItemName,
            price: parseFloat(newItemPrice),
            category: newItemCategory
        };
        setMenu([...menu, newItem]);
        setNewItemName('');
        setNewItemPrice('');
        setNewItemCategory('mains');
    };

    const handleDeleteMenuItem = (id) => {
        if (confirm('هل أنت متأكد من رغبتك في حذف هذا الصنف من القائمة؟')) {
            setMenu(menu.filter(item => item.id !== id));
        }
    };

    // --- Handler Functions: Inventory ---
    const handleAddInventory = (e) => {
        e.preventDefault();
        if (!newInvName || !newInvQty || !newInvThreshold) return;
        const newItem = {
            id: Date.now(),
            name: newInvName,
            quantity: parseFloat(newInvQty),
            unit: newInvUnit,
            lowThreshold: parseFloat(newInvThreshold)
        };
        setInventory([...inventory, newItem]);
        setNewInvName('');
        setNewInvQty('');
        setNewInvThreshold('');
        setShowAddInvForm(false);
    };

    const adjustStock = (id, amount) => {
        setInventory(inventory.map(item => {
            if (item.id === id) {
                const newQty = Math.max(0, item.quantity + amount);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const deleteInventoryItem = (id) => {
        if (confirm('هل تريد إزالة هذا الصنف من تتبع المخزون؟')) {
            setInventory(inventory.filter(item => item.id !== id));
        }
    };

    // --- Handler Functions: Employees ---
    const handleAddEmployee = (e) => {
        e.preventDefault();
        if (!newEmpName || !newEmpRole || !newEmpBase) return;
        const newEmp = {
            id: Date.now(),
            name: newEmpName,
            role: newEmpRole,
            baseSalary: parseFloat(newEmpBase),
            bonuses: 0,
            deductions: 0,
            paymentStatus: 'pending',
            lastPaymentDate: '-'
        };
        setEmployees([...employees, newEmp]);
        setNewEmpName('');
        setNewEmpRole('');
        setNewEmpBase('');
        setShowAddEmpForm(false);
    };

    const updateSalaryParams = (id, field, value) => {
        const parsedVal = parseFloat(value) || 0;
        setEmployees(employees.map(emp => {
            if (emp.id === id) {
                return { ...emp, [field]: parsedVal };
            }
            return emp;
        }));
    };

    const togglePaymentStatus = (id) => {
        setEmployees(employees.map(emp => {
            if (emp.id === id) {
                const newStatus = emp.paymentStatus === 'paid' ? 'pending' : 'paid';
                const todayStr = newStatus === 'paid' ? new Date().toISOString().split('T')[0] : emp.lastPaymentDate;
                return {
                    ...emp,
                    paymentStatus: newStatus,
                    lastPaymentDate: todayStr
                };
            }
            return emp;
        }));
    };

    const deleteEmployee = (id) => {
        if (confirm('هل أنت متأكد من إنهاء خدمة هذا الموظف وإزالته من كشف الرواتب؟')) {
            setEmployees(employees.filter(emp => emp.id !== id));
        }
    };

    // --- Calculated Metrics for Top Bar ---
    const totalMenuItems = menu.length;
    const lowStockItemsCount = inventory.filter(item => item.quantity <= item.lowThreshold).length;
    
    const calculateNetPay = (emp) => emp.baseSalary + emp.bonuses - emp.deductions;
    const totalSalariesCost = employees.reduce((acc, emp) => acc + calculateNetPay(emp), 0);
    const pendingSalariesCost = employees
        .filter(emp => emp.paymentStatus === 'pending')
        .reduce((acc, emp) => acc + calculateNetPay(emp), 0);

    return (
        <div className="flex-1 bg-slate-900 text-slate-100 flex flex-col p-6 overflow-y-auto" dir="rtl">
            
            {/* 1. Header & Title Banner */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-100 flex items-center gap-2 tracking-tight">
                        <span className="text-emerald-400 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">📊</span>
                        لوحة الإشراف وإدارة النظام
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">تحليل ومراقبة الأصناف، مستويات المواد الخام في المخازن، ومستحقات الكادر الوظيفي.</p>
                </div>
                
                {/* View Toggles */}
                <div className="flex bg-slate-800 p-1.5 rounded-2xl border border-slate-700/80 shadow-md">
                    <button
                        onClick={() => setActiveTab('menu')}
                        className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${
                            activeTab === 'menu'
                                ? 'bg-slate-700 text-emerald-400 shadow-sm animate-pulse'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        🍔 إدارة القائمة
                    </button>
                    <button
                        onClick={() => setActiveTab('inventory')}
                        className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${
                            activeTab === 'inventory'
                                ? 'bg-slate-700 text-emerald-400 shadow-sm animate-pulse'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        📦 تتبع المخزون
                    </button>
                    <button
                        onClick={() => setActiveTab('salaries')}
                        className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${
                            activeTab === 'salaries'
                                ? 'bg-slate-700 text-emerald-400 shadow-sm animate-pulse'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        💼 رواتب الموظفين
                    </button>
                </div>
            </div>

            {/* 2. Top Metrics Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
                {/* Metric 1 */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-850 border border-slate-700/50 p-5 rounded-2xl shadow flex items-center justify-between">
                    <div>
                        <span className="text-xs text-slate-400 font-bold block mb-1">أصناف القائمة النشطة</span>
                        <span className="text-3xl font-extrabold text-white">{totalMenuItems}</span>
                    </div>
                    <span className="text-3xl p-3 bg-emerald-500/10 rounded-xl text-emerald-400">🍽️</span>
                </div>

                {/* Metric 2 */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-850 border border-slate-700/50 p-5 rounded-2xl shadow flex items-center justify-between">
                    <div>
                        <span className="text-xs text-slate-400 font-bold block mb-1">نقص في المخزون (تنبيه)</span>
                        <span className={`text-3xl font-extrabold ${lowStockItemsCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {lowStockItemsCount}
                        </span>
                    </div>
                    <span className={`text-3xl p-3 rounded-xl ${lowStockItemsCount > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-700/55 text-slate-400'}`}>
                        ⚠️
                    </span>
                </div>

                {/* Metric 3 */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-850 border border-slate-700/50 p-5 rounded-2xl shadow flex items-center justify-between">
                    <div>
                        <span className="text-xs text-slate-400 font-bold block mb-1">إجمالي رواتب الشهر الحالي</span>
                        <span className="text-3xl font-extrabold text-white">{totalSalariesCost} <span className="text-xs font-normal text-slate-400">جنية</span></span>
                    </div>
                    <span className="text-3xl p-3 bg-indigo-500/10 rounded-xl text-indigo-400">💸</span>
                </div>

                {/* Metric 4 */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-850 border border-slate-700/50 p-5 rounded-2xl shadow flex items-center justify-between">
                    <div>
                        <span className="text-xs text-slate-400 font-bold block mb-1">مستحقات معلقة للموظفين</span>
                        <span className={`text-3xl font-extrabold ${pendingSalariesCost > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {pendingSalariesCost} <span className="text-xs font-normal text-slate-400">جنية</span>
                        </span>
                    </div>
                    <span className={`text-3xl p-3 rounded-xl ${pendingSalariesCost > 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-700/55 text-slate-400'}`}>
                        ⏳
                    </span>
                </div>
            </div>

            {/* 3. Tab Sub-Views Content Area */}
            <div className="flex-1 bg-slate-800/40 border border-slate-700/55 rounded-2xl p-6 shadow-xl backdrop-blur-md">
                
                {/* ==================== TAB 1: MENU MANAGEMENT ==================== */}
                {activeTab === 'menu' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-700/60 pb-4">
                            <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                                <span className="text-emerald-400">🍔</span> إدارة قائمة المأكولات والمشروبات
                            </h3>
                            {/* Search bar */}
                            <input
                                type="text"
                                placeholder="ابحث عن صنف معين..."
                                value={menuSearch}
                                onChange={(e) => setMenuSearch(e.target.value)}
                                className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-right w-full sm:w-64"
                            />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                            
                            {/* Form: Add Menu Item */}
                            <div className="bg-slate-800 border border-slate-700/60 rounded-xl p-5 shadow-sm space-y-4">
                                <h4 className="font-bold text-lg text-emerald-400 border-b border-slate-700 pb-2">إضافة صنف جديد</h4>
                                <form onSubmit={handleAddMenuItem} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم الصنف</label>
                                        <input
                                            type="text"
                                            required
                                            value={newItemName}
                                            onChange={(e) => setNewItemName(e.target.value)}
                                            placeholder="مثال: شاورما لحم دبل"
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-right"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-300 mb-1.5">السعر (جنية)</label>
                                            <input
                                                type="number"
                                                required
                                                min="0.01"
                                                step="0.01"
                                                value={newItemPrice}
                                                onChange={(e) => setNewItemPrice(e.target.value)}
                                                placeholder="65.00"
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-center"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-300 mb-1.5">الفئة</label>
                                            <select
                                                value={newItemCategory}
                                                onChange={(e) => setNewItemCategory(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-center"
                                            >
                                                <option value="mains">وجبات رئيسية</option>
                                                <option value="sides">مقبلات جانبية</option>
                                                <option value="drinks">مشروبات باردة</option>
                                            </select>
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-lg transition shadow shadow-emerald-950/50 cursor-pointer"
                                    >
                                        إدراج في القائمة +
                                    </button>
                                </form>
                            </div>

                            {/* Table: Menu List */}
                            <div className="lg:col-span-2 bg-slate-800 border border-slate-700/60 rounded-xl overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-right border-collapse">
                                        <thead>
                                            <tr className="bg-slate-700/50 text-slate-300 border-b border-slate-700 text-sm">
                                                <th className="p-3.5 font-bold">اسم الوجبة/الصنف</th>
                                                <th className="p-3.5 font-bold text-center">الفئة</th>
                                                <th className="p-3.5 font-bold text-center">السعر</th>
                                                <th className="p-3.5 font-bold text-center">الإجراءات</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700/40 text-sm">
                                            {menu
                                                .filter(item => item.name.toLowerCase().includes(menuSearch.toLowerCase()))
                                                .map((item) => (
                                                    <tr key={item.id} className="hover:bg-slate-750/30 transition-colors">
                                                        <td className="p-3.5 font-bold text-white">{item.name}</td>
                                                        <td className="p-3.5 text-center">
                                                            <span className="bg-slate-900/60 px-3 py-1 rounded-full text-xs font-semibold text-slate-300 border border-slate-700/50">
                                                                {item.category === 'mains' ? 'وجبة رئيسية' : item.category === 'sides' ? 'مقبلات' : 'مشروبات'}
                                                            </span>
                                                        </td>
                                                        <td className="p-3.5 text-center font-extrabold text-emerald-400">{item.price.toFixed(2)} جنية</td>
                                                        <td className="p-3.5 text-center">
                                                            <button
                                                                onClick={() => handleDeleteMenuItem(item.id)}
                                                                className="text-rose-400 hover:text-rose-350 hover:bg-rose-500/10 px-3 py-1.5 rounded-lg transition text-xs font-bold cursor-pointer"
                                                            >
                                                                حذف 🗑️
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            {menu.length === 0 && (
                                                <tr>
                                                    <td colSpan="4" className="text-center p-8 text-slate-500">لا يوجد أصناف في القائمة حالياً.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ==================== TAB 2: INVENTORY TRACKING ==================== */}
                {activeTab === 'inventory' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-700/60 pb-4">
                            <div>
                                <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                                    <span className="text-emerald-400">📦</span> مراقبة مستويات المخزون والمواد الأولية
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">تتبع استهلاك المواد الأساسية للطهي والتنبيه عند انخفاضها للطلب الفوري.</p>
                            </div>
                            <button
                                onClick={() => setShowAddInvForm(!showAddInvForm)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-xl transition text-sm cursor-pointer shadow shadow-emerald-950/40"
                            >
                                {showAddInvForm ? 'إغلاق النموذج' : 'إضافة مادة أولية جديدة +'}
                            </button>
                        </div>

                        {/* Add Inventory Item Form */}
                        {showAddInvForm && (
                            <form onSubmit={handleAddInventory} className="bg-slate-850 border border-slate-700/65 rounded-xl p-5 shadow-inner grid grid-cols-1 md:grid-cols-4 gap-4 items-end animate-fadeIn">
                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم المادة الخام</label>
                                    <input
                                        type="text"
                                        required
                                        value={newInvName}
                                        onChange={(e) => setNewInvName(e.target.value)}
                                        placeholder="مثال: ثوم مفروم"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-right"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-300 mb-1.5">الكمية الحالية</label>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            value={newInvQty}
                                            onChange={(e) => setNewInvQty(e.target.value)}
                                            placeholder="50"
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-center"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-300 mb-1.5">الوحدة</label>
                                        <select
                                            value={newInvUnit}
                                            onChange={(e) => setNewInvUnit(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-center"
                                        >
                                            <option value="كجم">كجم</option>
                                            <option value="قطعة">قطعة</option>
                                            <option value="لتر">لتر</option>
                                            <option value="صندوق">صندوق</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1.5">حد التنبيه بالانخفاض</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={newInvThreshold}
                                        onChange={(e) => setNewInvThreshold(e.target.value)}
                                        placeholder="10"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-center"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg transition text-sm cursor-pointer shadow shadow-emerald-950/40"
                                >
                                    حفظ المادة الخام
                                </button>
                            </form>
                        )}

                        {/* Inventory Table */}
                        <div className="bg-slate-800 border border-slate-700/60 rounded-xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-right border-collapse">
                                    <thead>
                                        <tr className="bg-slate-700/50 text-slate-300 border-b border-slate-700 text-sm">
                                            <th className="p-3.5 font-bold">اسم المادة الخام</th>
                                            <th className="p-3.5 font-bold text-center">الكمية المتوفرة</th>
                                            <th className="p-3.5 font-bold text-center">الحد الأدنى للتنبيه</th>
                                            <th className="p-3.5 font-bold text-center">حالة المخزون</th>
                                            <th className="p-3.5 font-bold text-center">تحديث سريع للرصيد</th>
                                            <th className="p-3.5 font-bold text-center">إجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/40 text-sm">
                                        {inventory.map((item) => {
                                            const isOutOfStock = item.quantity <= 0;
                                            const isLowStock = item.quantity <= item.lowThreshold;
                                            
                                            let statusBadge = (
                                                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold">
                                                    كافٍ
                                                </span>
                                            );
                                            if (isOutOfStock) {
                                                statusBadge = (
                                                    <span className="bg-rose-500/15 border border-rose-500/30 text-rose-400 px-3 py-1 rounded-full text-xs font-bold">
                                                        نفذ بالكامل
                                                    </span>
                                                );
                                            } else if (isLowStock) {
                                                statusBadge = (
                                                    <span className="bg-amber-500/15 border border-amber-500/30 text-amber-400 px-3 py-1 rounded-full text-xs font-bold">
                                                        مخزون منخفض ⚠️
                                                    </span>
                                                );
                                            }

                                            return (
                                                <tr key={item.id} className="hover:bg-slate-750/30 transition-colors">
                                                    <td className="p-3.5 font-bold text-white">{item.name}</td>
                                                    <td className="p-3.5 text-center font-mono text-base font-black">
                                                        {item.quantity} {item.unit}
                                                    </td>
                                                    <td className="p-3.5 text-center text-slate-400">
                                                        {item.lowThreshold} {item.unit}
                                                    </td>
                                                    <td className="p-3.5 text-center">
                                                        {statusBadge}
                                                    </td>
                                                    <td className="p-3.5 text-center">
                                                        <div className="flex justify-center items-center gap-1.5">
                                                            <button
                                                                onClick={() => adjustStock(item.id, -5)}
                                                                className="bg-slate-700 hover:bg-slate-650 text-slate-300 w-8 h-8 rounded-lg font-bold flex items-center justify-center transition cursor-pointer text-xs"
                                                                title="استهلاك 5 وحدات"
                                                            >
                                                                -5
                                                            </button>
                                                            <button
                                                                onClick={() => adjustStock(item.id, -1)}
                                                                className="bg-slate-700 hover:bg-slate-650 text-slate-300 w-8 h-8 rounded-lg font-bold flex items-center justify-center transition cursor-pointer text-xs"
                                                                title="استهلاك وحدة واحدة"
                                                            >
                                                                -1
                                                            </button>
                                                            <button
                                                                onClick={() => adjustStock(item.id, 1)}
                                                                className="bg-slate-700 hover:bg-slate-650 text-slate-300 w-8 h-8 rounded-lg font-bold flex items-center justify-center transition cursor-pointer text-xs"
                                                                title="توريد وحدة واحدة"
                                                            >
                                                                +1
                                                            </button>
                                                            <button
                                                                onClick={() => adjustStock(item.id, 5)}
                                                                className="bg-slate-700 hover:bg-slate-650 text-slate-300 w-8 h-8 rounded-lg font-bold flex items-center justify-center transition cursor-pointer text-xs"
                                                                title="توريد 5 وحدات"
                                                            >
                                                                +5
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="p-3.5 text-center">
                                                        <button
                                                            onClick={() => deleteInventoryItem(item.id)}
                                                            className="text-rose-400 hover:text-rose-350 hover:bg-rose-500/10 px-3 py-1 rounded-lg text-xs transition font-bold cursor-pointer"
                                                        >
                                                            إزالة 🗑️
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ==================== TAB 3: EMPLOYEE SALARY MANAGEMENT ==================== */}
                {activeTab === 'salaries' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-700/60 pb-4">
                            <div>
                                <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                                    <span className="text-emerald-400">💼</span> إدارة مستحقات الكادر الوظيفي والرواتب
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">تحديد وحساب الحوافز الشهرية، الخصومات التأديبية، واعتماد تسليم الراتب.</p>
                            </div>
                            <button
                                onClick={() => setShowAddEmpForm(!showAddEmpForm)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-xl transition text-sm cursor-pointer shadow shadow-emerald-950/40"
                            >
                                {showAddEmpForm ? 'إغلاق النموذج' : 'تسجيل موظف جديد +'}
                            </button>
                        </div>

                        {/* Add Employee Form */}
                        {showAddEmpForm && (
                            <form onSubmit={handleAddEmployee} className="bg-slate-850 border border-slate-700/65 rounded-xl p-5 shadow-inner grid grid-cols-1 md:grid-cols-4 gap-4 items-end animate-fadeIn">
                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1.5">الاسم الكامل للموظف</label>
                                    <input
                                        type="text"
                                        required
                                        value={newEmpName}
                                        onChange={(e) => setNewEmpName(e.target.value)}
                                        placeholder="مثال: خالد وليد القحطاني"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-right"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1.5">المسمى الوظيفي</label>
                                    <input
                                        type="text"
                                        required
                                        value={newEmpRole}
                                        onChange={(e) => setNewEmpRole(e.target.value)}
                                        placeholder="مثال: مساعد شيف تحضير"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-right"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1.5">الراتب الأساسي (جنية)</label>
                                    <input
                                        type="number"
                                        required
                                        min="100"
                                        value={newEmpBase}
                                        onChange={(e) => setNewEmpBase(e.target.value)}
                                        placeholder="4000"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-center"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg transition text-sm cursor-pointer shadow shadow-emerald-950/40"
                                >
                                    حفظ وتعيين الموظف
                                </button>
                            </form>
                        )}

                        {/* Employees Salary Table */}
                        <div className="bg-slate-800 border border-slate-700/60 rounded-xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-right border-collapse whitespace-nowrap">
                                    <thead>
                                        <tr className="bg-slate-700/50 text-slate-300 border-b border-slate-700 text-sm">
                                            <th className="p-3.5 font-bold">اسم الموظف / الدور</th>
                                            <th className="p-3.5 font-bold text-center">الراتب الأساسي</th>
                                            <th className="p-3.5 font-bold text-center">المكافآت والحوافز</th>
                                            <th className="p-3.5 font-bold text-center">الاستقطاعات والخصم</th>
                                            <th className="p-3.5 font-bold text-center">الصافي الكلي</th>
                                            <th className="p-3.5 font-bold text-center">حالة الصرف</th>
                                            <th className="p-3.5 font-bold text-center">تاريخ التحويل</th>
                                            <th className="p-3.5 font-bold text-center">الإجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/40 text-sm">
                                        {employees.map((emp) => {
                                            const netPay = calculateNetPay(emp);
                                            return (
                                                <tr key={emp.id} className="hover:bg-slate-750/30 transition-colors">
                                                    <td className="p-3.5">
                                                        <div className="font-bold text-white">{emp.name}</div>
                                                        <div className="text-xs text-slate-400 mt-0.5">{emp.role}</div>
                                                    </td>
                                                    <td className="p-3.5 text-center font-mono font-bold text-slate-200">
                                                        {emp.baseSalary}
                                                    </td>
                                                    <td className="p-3.5 text-center">
                                                        <div className="flex justify-center items-center gap-1">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={emp.bonuses}
                                                                onChange={(e) => updateSalaryParams(emp.id, 'bonuses', e.target.value)}
                                                                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs w-16 text-center text-emerald-400 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                                                            />
                                                            <span className="text-xs text-slate-400">جنية</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-3.5 text-center">
                                                        <div className="flex justify-center items-center gap-1">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={emp.deductions}
                                                                onChange={(e) => updateSalaryParams(emp.id, 'deductions', e.target.value)}
                                                                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs w-16 text-center text-rose-400 font-bold focus:outline-none focus:ring-1 focus:ring-rose-500/50"
                                                            />
                                                            <span className="text-xs text-slate-400">جنية</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-3.5 text-center font-extrabold text-white text-base">
                                                        {netPay} <span className="text-xs text-slate-400 font-normal">جنية</span>
                                                    </td>
                                                    <td className="p-3.5 text-center">
                                                        <button
                                                            onClick={() => togglePaymentStatus(emp.id)}
                                                            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                                                                emp.paymentStatus === 'paid'
                                                                    ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-400 hover:bg-emerald-500/20'
                                                                    : 'bg-amber-500/10 border-amber-500/35 text-amber-400 hover:bg-amber-500/20'
                                                            }`}
                                                        >
                                                            {emp.paymentStatus === 'paid' ? 'تم الصرف 🟢' : 'معلق / اعتماد الراتب ⏳'}
                                                        </button>
                                                    </td>
                                                    <td className="p-3.5 text-center font-mono text-xs text-slate-400">
                                                        {emp.lastPaymentDate}
                                                    </td>
                                                    <td className="p-3.5 text-center">
                                                        <button
                                                            onClick={() => deleteEmployee(emp.id)}
                                                            className="text-rose-400 hover:text-rose-350 hover:bg-rose-500/10 px-3 py-1.5 rounded-lg text-xs transition font-bold cursor-pointer"
                                                        >
                                                            إنهاء الخدمة 🗑️
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {employees.length === 0 && (
                                            <tr>
                                                <td colSpan="8" className="text-center p-8 text-slate-500">لا يوجد موظفين مسجلين حالياً.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

import { useState, useEffect, useRef } from 'react';
import PeriodFilter, { filterOrdersByPeriod } from '../../components/PeriodFilter';

export default function AdminDashboardPage({ user, menu, setMenu, categories = [], setCategories }) {
    // 2. Active Tab State ('menu', 'inventory', 'salaries', 'reports')
    const [activeTab, setActiveTab] = useState('menu');

    // --- State: Inventory ---
    const [inventory, setInventory] = useState([]);

    // --- State: Employees & Salaries ---
    const [employees, setEmployees] = useState([]);

    // --- State: Orders / Transactions Log ---
    const [orders, setOrders] = useState([]);

    // --- Form Inputs States ---
    // Menu item form
    const [newItemName, setNewItemName] = useState('');
    const [newItemPrice, setNewItemPrice] = useState('');
    const [newItemCategory, setNewItemCategory] = useState('');
    const [menuSearch, setMenuSearch] = useState('');

    // Category management
    const [newCategoryName, setNewCategoryName] = useState('');

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

    // Add User Account States
    const [regUsername, setRegUsername] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regRole, setRegRole] = useState('employee');
    const [regQuestion, setRegQuestion] = useState('ما هو اسم أول مدرسة درست بها؟');
    const [regAnswer, setRegAnswer] = useState('');
    const [showAddUserForm, setShowAddUserForm] = useState(false);

    // Search and expand details for reports
    const [reportsSearch, setReportsSearch] = useState('');
    const [expandedOrder, setExpandedOrder] = useState(null);

    // --- Controlled Period Filter State (lifted so it persists across tab switches) ---
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const [filterMode, setFilterMode] = useState('year-month');
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);

    // Derived filtered orders — always up to date with both orders list and filter settings
    const periodFilteredOrders = filterOrdersByPeriod(orders, filterMode, selectedYear, selectedMonth);

    // In-app Toast — replaces native alert() to keep Electron window focus
    const [toast, setToast] = useState(null);
    const toastTimer = useRef(null);
    const showToast = (msg, type = 'error') => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToast({ msg, type });
        toastTimer.current = setTimeout(() => setToast(null), 3500);
    };

    // In-app Confirm Modal — replaces native confirm() dialog
    const [confirmModal, setConfirmModal] = useState(null); // { msg, onConfirm }
    const showConfirm = (msg, onConfirm) => setConfirmModal({ msg, onConfirm });

    // Sync default category selection when categories list arrives
    useEffect(() => {
        if (categories.length > 0 && !newItemCategory) {
            setNewItemCategory(categories[0].name);
        }
    }, [categories]);

    // Load initial SQLite data on mount
    useEffect(() => {
        const loadDbData = async () => {
            if (window.api && window.api.db) {
                try {
                    const dbInv = await window.api.db.getInventory();
                    const mappedInv = dbInv.map(item => ({
                        id: item.id,
                        name: item.name,
                        quantity: item.quantity,
                        unit: item.unit,
                        lowThreshold: item.low_threshold
                    }));
                    setInventory(mappedInv);
                    
                    const dbEmp = await window.api.db.getEmployees();
                    const mappedEmp = dbEmp.map(e => ({
                        id: e.id,
                        name: e.name,
                        role: e.role,
                        baseSalary: e.base_salary,
                        bonuses: e.bonuses,
                        deductions: e.deductions,
                        paymentStatus: e.payment_status,
                        lastPaymentDate: e.last_payment_date
                    }));
                    setEmployees(mappedEmp);

                    const dbOrders = await window.api.db.getOrders();
                    setOrders(dbOrders);
                } catch (err) {
                    console.error('Failed to load sqlite datasets:', err);
                }
            }
        };
        loadDbData();
    }, []);

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
    const handleAddMenuItem = async (e) => {
        e.preventDefault();
        if (!newItemName || !newItemPrice || !newItemCategory) return;
        try {
            if (window.api && window.api.db) {
                const added = await window.api.db.addMenuItem(newItemName, parseFloat(newItemPrice), newItemCategory);
                setMenu([...menu, added]);
            } else {
                const newItem = {
                    id: Date.now(),
                    name: newItemName,
                    price: parseFloat(newItemPrice),
                    category: newItemCategory
                };
                setMenu([...menu, newItem]);
            }
            setNewItemName('');
            setNewItemPrice('');
            setNewItemCategory(categories.length > 0 ? categories[0].name : '');
        } catch (err) {
            alert('خطأ أثناء إضافة الصنف: ' + err.message);
        }
    };

    const handleDeleteMenuItem = async (id) => {
        showConfirm('هل أنت متأكد من رغبتك في حذف هذا الصنف من القائمة؟', async () => {
            try {
                if (window.api && window.api.db) {
                    await window.api.db.deleteMenuItem(id);
                }
                setMenu(menu.filter(item => item.id !== id));
            } catch (err) {
                showToast('خطأ أثناء حذف الصنف: ' + err.message);
            }
        });
    };

    // --- Handler Functions: Categories ---
    const handleAddCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        try {
            if (window.api && window.api.db) {
                const res = await window.api.db.addCategory(newCategoryName.trim());
                if (res.success) {
                    setCategories([...categories, { id: res.id, name: res.name }]);
                    if (!newItemCategory) setNewItemCategory(res.name);
                    setNewCategoryName('');
                    showToast(`تم إضافة الفئة: ${res.name}`, 'success');
                } else {
                    showToast('فشل إضافة الفئة: ' + res.error);
                }
            } else {
                const newCat = { id: Date.now(), name: newCategoryName.trim() };
                setCategories([...categories, newCat]);
                if (!newItemCategory) setNewItemCategory(newCat.name);
                setNewCategoryName('');
                showToast(`تم إضافة الفئة: ${newCat.name}`, 'success');
            }
        } catch (err) {
            showToast('خطأ أثناء إضافة الفئة: ' + err.message);
        }
    };

    const handleDeleteCategory = async (id, name) => {
        showConfirm(`هل تريد حذف فئة "${name}"؟ سيبقى الأصناف المرتبطة بها كما هي.`, async () => {
            try {
                if (window.api && window.api.db) {
                    await window.api.db.deleteCategory(id);
                }
                const updated = categories.filter(c => c.id !== id);
                setCategories(updated);
                if (newItemCategory === name) {
                    setNewItemCategory(updated.length > 0 ? updated[0].name : '');
                }
                showToast(`تم حذف الفئة: ${name}`, 'success');
            } catch (err) {
                showToast('خطأ أثناء حذف الفئة: ' + err.message);
            }
        });
    };

    // --- Handler Functions: Inventory ---
    const handleAddInventory = async (e) => {
        e.preventDefault();
        if (!newInvName || !newInvQty || !newInvThreshold) return;
        try {
            if (window.api && window.api.db) {
                const added = await window.api.db.addInventoryItem(newInvName, parseFloat(newInvQty), newInvUnit, parseFloat(newInvThreshold));
                setInventory([...inventory, {
                    id: added.id,
                    name: added.name,
                    quantity: added.quantity,
                    unit: added.unit,
                    lowThreshold: added.low_threshold
                }]);
            } else {
                const newItem = {
                    id: Date.now(),
                    name: newInvName,
                    quantity: parseFloat(newInvQty),
                    unit: newInvUnit,
                    lowThreshold: parseFloat(newInvThreshold)
                };
                setInventory([...inventory, newItem]);
            }
            setNewInvName('');
            setNewInvQty('');
            setNewInvThreshold('');
            setShowAddInvForm(false);
        } catch (err) {
            showToast('خطأ أثناء إضافة المادة الخام: ' + err.message);
        }
    };

    const adjustStock = async (id, amount) => {
        try {
            if (window.api && window.api.db) {
                const res = await window.api.db.adjustStock(id, amount);
                setInventory(inventory.map(item => {
                    if (item.id === id) {
                        return { ...item, quantity: res.newQuantity };
                    }
                    return item;
                }));
            } else {
                setInventory(inventory.map(item => {
                    if (item.id === id) {
                        const newQty = Math.max(0, item.quantity + amount);
                        return { ...item, quantity: newQty };
                    }
                    return item;
                }));
            }
        } catch (err) {
            showToast('خطأ في تعديل المخزون: ' + err.message);
        }
    };

    const deleteInventoryItem = async (id) => {
        showConfirm('هل تريد إزالة هذا الصنف من تتبع المخزون؟', async () => {
            try {
                if (window.api && window.api.db) {
                    await window.api.db.deleteInventoryItem(id);
                }
                setInventory(inventory.filter(item => item.id !== id));
            } catch (err) {
                showToast('خطأ أثناء الحذف: ' + err.message);
            }
        });
    };

    // --- Handler Functions: Employees ---
    const handleAddEmployee = async (e) => {
        e.preventDefault();
        if (!newEmpName || !newEmpRole || !newEmpBase) return;
        try {
            if (window.api && window.api.db) {
                const added = await window.api.db.addEmployee(newEmpName, newEmpRole, parseFloat(newEmpBase));
                setEmployees([...employees, {
                    id: added.id,
                    name: added.name,
                    role: added.role,
                    baseSalary: added.base_salary,
                    bonuses: added.bonuses,
                    deductions: added.deductions,
                    paymentStatus: added.payment_status,
                    lastPaymentDate: added.last_payment_date
                }]);
            } else {
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
            }
            setNewEmpName('');
            setNewEmpRole('');
            setNewEmpBase('');
            setShowAddEmpForm(false);
        } catch (err) {
            showToast('خطأ أثناء إضافة الموظف: ' + err.message);
        }
    };

    const updateSalaryParams = async (id, field, value) => {
        const parsedVal = parseFloat(value) || 0;
        try {
            if (window.api && window.api.db) {
                const dbField = field === 'baseSalary' ? 'base_salary' : field;
                await window.api.db.updateSalaryParams(id, dbField, parsedVal);
            }
            setEmployees(employees.map(emp => {
                if (emp.id === id) {
                    return { ...emp, [field]: parsedVal };
                }
                return emp;
            }));
        } catch (err) {
            console.error('Failed to update salary details in SQLite:', err);
        }
    };

    const togglePaymentStatus = async (id) => {
        try {
            if (window.api && window.api.db) {
                const res = await window.api.db.togglePaymentStatus(id);
                setEmployees(employees.map(emp => {
                    if (emp.id === id) {
                        return {
                            ...emp,
                            paymentStatus: res.paymentStatus,
                            lastPaymentDate: res.lastPaymentDate
                        };
                    }
                    return emp;
                }));
            } else {
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
            }
        } catch (err) {
            showToast('خطأ أثناء تعديل حالة الدفع: ' + err.message);
        }
    };

    const deleteEmployee = async (id) => {
        showConfirm('هل أنت متأكد من إنهاء خدمة هذا الموظف وإزالته من كشف الرواتب؟', async () => {
            try {
                if (window.api && window.api.db) {
                    await window.api.db.deleteEmployee(id);
                }
                setEmployees(employees.filter(emp => emp.id !== id));
            } catch (err) {
                showToast('خطأ أثناء إزالة الموظف: ' + err.message);
            }
        });
    };

    const deleteOrder = async (order, displayIndex) => {
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

    // --- Handler Functions: User Registrations ---
    const handleAddUser = async (e) => {
        e.preventDefault();
        if (!regUsername || !regPassword || !regAnswer) return;
        try {
            if (window.api && window.api.db) {
                const res = await window.api.db.registerUser(regUsername, regPassword, regRole, regQuestion, regAnswer);
                if (res.success) {
                    showToast(`تم إنشاء حساب (${regRole === 'admin' ? 'مدير' : 'كاشير'}) بنجاح للمستخدم: ${regUsername}`, 'success');
                    setRegUsername('');
                    setRegPassword('');
                    setRegAnswer('');
                    setShowAddUserForm(false);
                } else {
                    showToast('فشل إنشاء الحساب: ' + res.error);
                }
            } else {
                showToast('نظام قواعد البيانات غير متصل.');
            }
        } catch (err) {
            showToast('خطأ: ' + err.message);
        }
    };

    // Trigger reports reload when reports tab selected
    const handleSelectReportsTab = async () => {
        setActiveTab('reports');
        if (window.api && window.api.db) {
            try {
                const dbOrders = await window.api.db.getOrders();
                setOrders(dbOrders);
            } catch (err) {
                console.error('Failed to reload orders:', err);
            }
        }
    };

    // --- Calculated Metrics for Top Bar ---
    const totalMenuItems = menu.length;
    const lowStockItemsCount = inventory.filter(item => item.quantity <= item.lowThreshold).length;
    
    // Top bar metrics ALWAYS reflect the active period filter — persists across all tab switches
    const totalRevenue = periodFilteredOrders.reduce((acc, order) => acc + (order.total || 0), 0);
    const totalOrdersCount = periodFilteredOrders.length;

    const calculateNetPay = (emp) => emp.baseSalary + emp.bonuses - emp.deductions;

    // Deduct paid salaries from total revenue
    const totalPaidSalaries = employees
        .filter(emp => emp.paymentStatus === 'paid')
        .reduce((acc, emp) => acc + calculateNetPay(emp), 0);
    const netRevenue = totalRevenue - totalPaidSalaries;

    return (
        <div className="flex-1 bg-slate-900 text-slate-100 flex flex-col p-6 overflow-y-auto relative" dir="rtl">

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
                        <p className="text-white font-semibold text-base mb-6">{confirmModal.msg}</p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setConfirmModal(null)}
                                className="px-5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-sm transition cursor-pointer"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}
                                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition cursor-pointer"
                            >
                                تأكيد الحذف
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
                    <button
                        onClick={handleSelectReportsTab}
                        className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${
                            activeTab === 'reports'
                                ? 'bg-slate-700 text-emerald-400 shadow-sm animate-pulse'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        📋 سجل الفواتير والتقارير
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
                        <span className="text-xs text-slate-400 font-bold block mb-1">
                            إيرادات الفترة المحددة
                        </span>
                        <span className={`text-3xl font-extrabold font-mono ${netRevenue < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {netRevenue.toFixed(2)} <span className="text-xs font-normal text-slate-400">جنية</span>
                        </span>
                        {totalPaidSalaries > 0 && (
                            <span className="text-xs text-slate-500 block mt-1">بعد خصم الرواتب المصروفة: {totalPaidSalaries.toFixed(2)}</span>
                        )}
                    </div>
                    <span className="text-3xl p-3 bg-emerald-500/10 rounded-xl text-emerald-400">💸</span>
                </div>

                {/* Metric 4 */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-850 border border-slate-700/50 p-5 rounded-2xl shadow flex items-center justify-between">
                    <div>
                        <span className="text-xs text-slate-400 font-bold block mb-1">
                            فواتير الفترة المحددة
                        </span>
                        <span className="text-3xl font-extrabold text-white font-mono">{totalOrdersCount}</span>
                    </div>
                    <span className="text-3xl p-3 bg-indigo-500/10 rounded-xl text-indigo-400">🧾</span>
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
                                                required
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-center"
                                            >
                                                {categories.length === 0 && (
                                                    <option value="" disabled>-- أضف فئة أولاً --</option>
                                                )}
                                                {categories.map(cat => (
                                                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={categories.length === 0}
                                        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-lg transition shadow shadow-emerald-950/50 cursor-pointer"
                                    >
                                        إدراج في القائمة +
                                    </button>
                                </form>

                                {/* --- Category Management Section --- */}
                                <div className="border-t border-slate-700 pt-4 space-y-3">
                                    <h4 className="font-bold text-sm text-slate-300 flex items-center gap-1.5">🗂️ إدارة الفئات</h4>
                                    <form onSubmit={handleAddCategory} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newCategoryName}
                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                            placeholder="اسم الفئة الجديدة..."
                                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-right"
                                        />
                                        <button
                                            type="submit"
                                            className="bg-slate-700 hover:bg-slate-600 text-emerald-400 font-bold px-3 py-2 rounded-lg transition text-xs cursor-pointer border border-slate-600 whitespace-nowrap"
                                        >
                                            + إضافة
                                        </button>
                                    </form>
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                        {categories.length === 0 && (
                                            <p className="text-xs text-slate-500 text-center py-2">لا توجد فئات. أضف فئة جديدة.</p>
                                        )}
                                        {categories.map(cat => (
                                            <div key={cat.id} className="flex items-center justify-between bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-1.5">
                                                <span className="text-sm text-slate-200 font-semibold">{cat.name}</span>
                                                <button
                                                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                                    className="text-rose-400 hover:text-rose-300 text-xs font-bold cursor-pointer transition px-2 py-0.5 hover:bg-rose-500/10 rounded"
                                                >
                                                    حذف
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
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
                                                                {item.category}
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
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setShowAddUserForm(!showAddUserForm); setShowAddEmpForm(false); }}
                                    className="bg-slate-750 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-2 px-4 rounded-xl transition text-sm cursor-pointer shadow shadow-slate-950/40"
                                >
                                    {showAddUserForm ? 'إغلاق نموذج الحسابات' : 'تسجيل حساب مستخدم 👤'}
                                </button>
                                <button
                                    onClick={() => { setShowAddEmpForm(!showAddEmpForm); setShowAddUserForm(false); }}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-xl transition text-sm cursor-pointer shadow shadow-emerald-950/40"
                                >
                                    {showAddEmpForm ? 'إغلاق نموذج الموظفين' : 'تسجيل موظف جديد +'}
                                </button>
                            </div>
                        </div>

                        {/* Add User Account Form */}
                        {showAddUserForm && (
                            <form onSubmit={handleAddUser} className="bg-slate-850 border border-slate-700/65 rounded-xl p-5 shadow-inner grid grid-cols-1 md:grid-cols-5 gap-4 items-end animate-fadeIn">
                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم مستخدم الحساب</label>
                                    <input
                                        type="text"
                                        required
                                        value={regUsername}
                                        onChange={(e) => setRegUsername(e.target.value)}
                                        placeholder="مثال: ahmed_pos"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-right"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1.5">كلمة مرور الحساب</label>
                                    <input
                                        type="password"
                                        required
                                        value={regPassword}
                                        onChange={(e) => setRegPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-right"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1.5">صلاحية الحساب</label>
                                    <select
                                        value={regRole}
                                        onChange={(e) => setRegRole(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-center"
                                    >
                                        <option value="employee">موظف مبيعات (كاشير)</option>
                                        <option value="admin">مدير النظام (مسؤول)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1.5">سؤال الأمان</label>
                                    <select
                                        value={regQuestion}
                                        onChange={(e) => setRegQuestion(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-right"
                                    >
                                        <option value="ما هو اسم أول مدرسة درست بها؟">ما هو اسم أول مدرسة درست بها؟</option>
                                        <option value="ما هو اسم المدينة التي ولدت بها؟">ما هو اسم المدينة التي ولدت بها؟</option>
                                        <option value="ما هو اسم أول حيوان أليف قمت بتربيته؟">ما هو اسم أول حيوان أليف قمت بتربيته؟</option>
                                        <option value="ما هي وظيفه أحلامك في الطفولة؟">ما هي وظيفه أحلامك في الطفولة؟</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-300 mb-1.5">إجابة سؤال الأمان</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            required
                                            value={regAnswer}
                                            onChange={(e) => setRegAnswer(e.target.value)}
                                            placeholder="اكتب الإجابة بدقة"
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-right"
                                        />
                                        <button
                                            type="submit"
                                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-lg transition text-sm cursor-pointer shadow whitespace-nowrap"
                                        >
                                            تأكيد الحساب
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}

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

                {/* ==================== TAB 4: SALES REPORTS & LOGS ==================== */}
                {activeTab === 'reports' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-700/60 pb-4">
                            <div>
                                <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                                    <span className="text-emerald-400">📊</span> سجل الفواتير والمبيعات التفصيلي
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">عرض وتحليل الفواتير المصدرة والبحث عن العمليات المحفوظة في قاعدة البيانات.</p>
                            </div>
                            <input
                                type="text"
                                placeholder="ابحث باسم الكاشير أو رقم الفاتورة..."
                                value={reportsSearch}
                                onChange={(e) => setReportsSearch(e.target.value)}
                                className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-right w-full sm:w-64"
                            />
                        </div>

                        {/* Period Filter Component — state is controlled by parent so it persists when switching tabs */}
                        <PeriodFilter
                            orders={orders}
                            filterMode={filterMode}
                            selectedYear={selectedYear}
                            selectedMonth={selectedMonth}
                            onFilterModeChange={setFilterMode}
                            onYearChange={setSelectedYear}
                            onMonthChange={setSelectedMonth}
                        />

                        {/* Orders Table */}
                        <div className="bg-slate-800 border border-slate-700/60 rounded-xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-right border-collapse">
                                    <thead>
                                        <tr className="bg-slate-700/50 text-slate-300 border-b border-slate-700 text-sm">
                                            <th className="p-3.5 font-bold">#</th>
                                            <th className="p-3.5 font-bold">الكاشير المسؤول</th>
                                            <th className="p-3.5 font-bold text-center">التاريخ والوقت</th>
                                            <th className="p-3.5 font-bold text-center">إجمالي الفاتورة</th>
                                            <th className="p-3.5 font-bold text-center">التفاصيل</th>
                                            <th className="p-3.5 font-bold text-center">الإجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/40 text-sm">
                                        {periodFilteredOrders
                                            .filter(order => {
                                                const searchLower = reportsSearch.toLowerCase();
                                                return (order.cashier && order.cashier.toLowerCase().includes(searchLower)) || 
                                                       order.items?.some(item => item.item_name.toLowerCase().includes(searchLower));
                                            })
                                            .map((order, index) => {
                                                const isExpanded = expandedOrder === order.id;
                                                const displayIndex = index + 1;
                                                return (
                                                    <tr key={order.id} className="hover:bg-slate-750/30 transition-colors">
                                                        <td className="p-3.5 font-bold text-white font-mono">#{displayIndex}</td>
                                                        <td className="p-3.5 font-bold text-slate-300">{order.cashier}</td>
                                                        <td className="p-3.5 text-center font-mono text-slate-400">
                                                            {new Date(order.timestamp).toLocaleString('ar-EG', { hour12: true })}
                                                        </td>
                                                        <td className="p-3.5 text-center font-extrabold text-emerald-400 font-mono">
                                                            {order.total.toFixed(2)} جنية
                                                        </td>
                                                        <td className="p-3.5 text-center">
                                                            <div className="flex flex-col gap-2">
                                                                <button
                                                                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                                                                    className="text-emerald-400 hover:text-emerald-350 hover:bg-emerald-500/10 px-3 py-1.5 rounded-lg text-xs transition font-bold cursor-pointer mx-auto"
                                                                >
                                                                    {isExpanded ? 'إخفاء التفاصيل ⬆️' : 'عرض الأصناف ⬇️'}
                                                                </button>
                                                                {isExpanded && (
                                                                    <div className="bg-slate-900 border border-slate-700/70 rounded-xl p-3 mt-2 text-right text-xs space-y-2 animate-fadeIn max-w-sm mx-auto">
                                                                        <div className="font-bold border-b border-slate-700 pb-1 text-slate-300">أصناف الفاتورة:</div>
                                                                        {order.items?.map((item, idx) => (
                                                                            <div key={idx} className="flex justify-between text-slate-400 gap-4">
                                                                                <span>{item.item_name} × {item.quantity}</span>
                                                                                <span className="font-mono text-slate-300">{(item.price * item.quantity).toFixed(2)} جنية</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="p-3.5 text-center">
                                                            <button
                                                                onClick={() => deleteOrder(order, displayIndex)}
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
                                        {periodFilteredOrders.length === 0 && (
                                            <tr>
                                                <td colSpan="6" className="text-center p-8 text-slate-500">
                                                    {orders.length === 0 ? 'لا يوجد فواتير مسجلة في النظام حالياً.' : 'لا توجد فواتير تطابق الفترة المحددة أو البحث.'}
                                                </td>
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

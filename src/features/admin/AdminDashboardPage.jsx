import { useState, useEffect, Fragment } from 'react';
import PeriodFilter from '../../components/PeriodFilter';
import { filterOrdersByPeriod } from '../../components/periodFilterUtils';
import icons from '../../components/icons';
import { useToast, useConfirm } from '../../components/ui';
import EmptyState from '../../components/ui/EmptyState';
import { tableWrap, theadClass, thClass, tbodyClass, rowClass, tdClass } from '../../components/ui/Table';
import { cx } from '../../components/ui/utils';
import { PackageX, Package, Boxes, Users, ReceiptText, SearchX } from 'lucide-react';

const COMPONENT_UNITS = ['قطعة', 'كجم', 'جرام', 'لتر', 'مللتر', 'صندوق'];

// Sequential ids for preview-mode (no-DB) fallback objects only
let demoId = 0;

const ARABIC_MONTH_LABELS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

// Filter dated payment records (salary_payments / purchase_payments, payment_date is a
// "YYYY-MM-DD" string) to the same period used for orders.
function filterPaymentsByPeriod(payments, filterMode, selectedYear, selectedMonth, selectedDate, dateFrom, dateTo) {
    if (!payments || !Array.isArray(payments)) return [];
    const now = new Date();

    const toLocalDateStr = (d) => {
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };

    return payments.filter(payment => {
        if (!payment || !payment.payment_date) return false;
        const parts = payment.payment_date.split('-').map(Number);
        if (parts.length < 3 || parts.some(isNaN)) return false;
        const d = new Date(parts[0], parts[1] - 1, parts[2]);

        if (filterMode === 'today') {
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
        }
        if (filterMode === 'week') {
            const dayOfWeek = now.getDay();
            const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0, 0);
            return d >= startOfWeek && d <= now;
        }
        if (filterMode === 'year-month') {
            if (d.getFullYear() !== Number(selectedYear)) return false;
            if (selectedMonth === null || selectedMonth === undefined || selectedMonth === 'all') return true;
            return d.getMonth() === Number(selectedMonth);
        }
        if (filterMode === 'date') {
            return Boolean(selectedDate && toLocalDateStr(d) === selectedDate);
        }
        if (filterMode === 'range') {
            const dayStr = toLocalDateStr(d);
            if (dateFrom && dayStr < dateFrom) return false;
            if (dateTo && dayStr > dateTo) return false;
            return true;
        }
        return true;
    });
}

function formatPaymentDate(dateStr) {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-').map(Number);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;
    return new Date(y, m - 1, d).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function AdminDashboardPage({ user, menu, setMenu, categories = [], setCategories, dbVersion = 0 }) {
    // 2. Active Tab State ('menu', 'inventory', 'salaries', 'reports')
    const [activeTab, setActiveTab] = useState('menu');

    // --- State: Inventory ---
    const [inventory, setInventory] = useState([]);

    // --- State: Employees & Salaries ---
    const [employees, setEmployees] = useState([]);

    // --- State: Salary Payment History ---
    const [salaryPayments, setSalaryPayments] = useState([]);
    const [showSalaryHistory, setShowSalaryHistory] = useState(false);
    const [salaryHistorySearch, setSalaryHistorySearch] = useState('');
    const [salaryHistoryYear, setSalaryHistoryYear] = useState(new Date().getFullYear());
    const [salaryHistoryMonth, setSalaryHistoryMonth] = useState(new Date().getMonth() + 1);

    // --- State: Orders / Transactions Log ---
    const [orders, setOrders] = useState([]);

    // --- State: Storage Purchases (مشتريات المخزن) ---
    const [purchases, setPurchases] = useState([]);
    const [purchasePayments, setPurchasePayments] = useState([]);
    const [showAddPurchaseForm, setShowAddPurchaseForm] = useState(false);
    const [newPurchaseItemId, setNewPurchaseItemId] = useState('');
    const [newPurchaseName, setNewPurchaseName] = useState('');
    const [newPurchaseQty, setNewPurchaseQty] = useState('');
    const [newPurchaseUnit, setNewPurchaseUnit] = useState('كجم');
    const [newPurchaseCost, setNewPurchaseCost] = useState('');
    const [newPurchasePaid, setNewPurchasePaid] = useState('');
    const [newPurchaseNotes, setNewPurchaseNotes] = useState('');
    const [payModal, setPayModal] = useState(null); // { purchaseId, itemName, remaining }
    const [payAmountInput, setPayAmountInput] = useState('');

    // Purchases search + filters
    const [purchasesSearch, setPurchasesSearch] = useState('');
    const [purchasesStatus, setPurchasesStatus] = useState('all'); // 'all' | 'paid' | 'partial'
    const [purchasesFilterMode, setPurchasesFilterMode] = useState('year-month'); // 'year-month' | 'range'
    const [purchasesYear, setPurchasesYear] = useState(new Date().getFullYear());
    const [purchasesMonth, setPurchasesMonth] = useState(new Date().getMonth() + 1);
    const [purchasesDateFrom, setPurchasesDateFrom] = useState('');
    const [purchasesDateTo, setPurchasesDateTo] = useState('');
    const [showDebtsOnly, setShowDebtsOnly] = useState(false);

    // --- Form Inputs States ---
    // Menu item form
    const [newItemName, setNewItemName] = useState('');
    const [newItemPrice, setNewItemPrice] = useState('');
    const [newItemCategory, setNewItemCategory] = useState('');
    const [menuSearch, setMenuSearch] = useState('');
    const [menuCategoryFilter, setMenuCategoryFilter] = useState('');

    // Category management
    const [newCategoryName, setNewCategoryName] = useState('');

    // Product Components (المكونات) state
    const [expandedComponentsId, setExpandedComponentsId] = useState(null);
    const [componentRows, setComponentRows] = useState([]);
    const [loadingComponents, setLoadingComponents] = useState(false);
    const [newCompType, setNewCompType] = useState('inventory');
    const [newCompItem, setNewCompItem] = useState('');
    const [newCompQty, setNewCompQty] = useState('');
    const [newCompUnit, setNewCompUnit] = useState('قطعة');

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

    // --- State: User Accounts (for admin management) ---
    const [userAccounts, setUserAccounts] = useState([]);

    // Search and expand details for reports
    const [reportsSearch, setReportsSearch] = useState('');
    const [expandedOrder, setExpandedOrder] = useState(null);

    // --- Controlled Period Filter State (lifted so it persists across tab switches) ---
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const [filterMode, setFilterMode] = useState('year-month');
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);
    const [selectedDate, setSelectedDate] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Derived filtered orders — always up to date with both orders list and filter settings
    const periodFilteredOrders = filterOrdersByPeriod(orders, filterMode, selectedYear, selectedMonth, selectedDate, dateFrom, dateTo);

    // In-app Toast — replaces native alert() to keep Electron window focus
    // Shared in-app toast + confirm (shims keep existing call sites unchanged)
    const toast = useToast();
    const showToast = (msg, type = 'success') => toast(msg, type);
    const confirm = useConfirm();
    const showConfirm = (message, onConfirm) => {
        confirm({ message }).then((ok) => { if (ok) onConfirm(); });
    };

    const loadSalaryPayments = async () => {
        if (window.api && window.api.db) {
            try {
                const dbPayments = await window.api.db.getSalaryPayments();
                setSalaryPayments(dbPayments || []);
            } catch (err) {
                console.error('Failed to load salary payments:', err);
            }
        }
    };

    const loadEmployees = async () => {
        if (window.api && window.api.db) {
            try {
                const dbEmp = await window.api.db.getEmployees();
                setEmployees(dbEmp.map(e => ({
                    id: e.id,
                    name: e.name,
                    role: e.role,
                    baseSalary: e.base_salary,
                    bonuses: e.bonuses,
                    deductions: e.deductions,
                    paymentStatus: e.payment_status,
                    lastPaymentDate: e.last_payment_date
                })));
            } catch (err) {
                console.error('Failed to load employees:', err);
            }
        }
    };

    const loadUserAccounts = async () => {
        if (window.api && window.api.db) {
            try {
                const dbUsers = await window.api.db.getUsers();
                setUserAccounts(dbUsers || []);
            } catch (err) {
                console.error('Failed to load user accounts:', err);
            }
        }
    };

    // Sync default category selection when categories list arrives
    if (categories.length > 0 && !newItemCategory) {
        setNewItemCategory(categories[0].name);
    }

    // Load initial SQLite data on mount, and re-load whenever dbVersion changes
    // (dbVersion is bumped by App.jsx after a database restore so the UI refreshes).
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
                    
                    await loadEmployees();

                    await loadSalaryPayments();

                    await loadUserAccounts();

                    const dbOrders = await window.api.db.getOrders();
                    setOrders(dbOrders);

                    const dbPurchases = await window.api.db.getPurchases();
                    setPurchases(dbPurchases || []);

                    const dbPurchasePayments = await window.api.db.getPurchasePayments();
                    setPurchasePayments(dbPurchasePayments || []);
                } catch (err) {
                    console.error('Failed to load sqlite datasets:', err);
                }
            }
        };
        loadDbData();
    }, [dbVersion]);

    // 1. Auth Guard Checklist
    if (!user || user.role !== 'admin') {
        return (
            <div className="flex-1 flex flex-col justify-center items-center bg-slate-900 text-white p-6" dir="rtl">
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-8 max-w-md text-center shadow-lg">
                <span className="text-5xl mb-4 block"><icons.ban size={48} className="inline text-danger-400" /></span>
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
                    id: ++demoId,
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

    // --- Product Components (المكونات) Handlers ---
    const resolveComponentInfo = (row) => {
        if (row.component_type === 'inventory') {
            const inv = inventory.find(i => i.id === row.component_id);
            return {
                name: inv ? inv.name : 'صنف مخزن محذوف',
                stock: inv ? inv.quantity : null,
                unit: inv ? inv.unit : '',
                low: inv ? inv.quantity <= inv.lowThreshold : false
            };
        }
        const m = menu.find(x => x.id === row.component_id);
        return { name: m ? m.name : 'صنف قائمة محذوف', stock: null, unit: '', low: false };
    };

    const toggleComponents = async (item) => {
        if (expandedComponentsId === item.id) {
            setExpandedComponentsId(null);
            setComponentRows([]);
            return;
        }
        setExpandedComponentsId(item.id);
        setComponentRows([]);
        setLoadingComponents(true);
        setNewCompItem('');
        setNewCompQty('');
        try {
            if (window.api && window.api.db) {
                const dbComps = await window.api.db.getProductComponents(item.id);
                setComponentRows((dbComps || []).map(c => ({
                    key: c.id,
                    component_type: c.component_type,
                    component_id: c.component_id,
                    usage_qty: c.usage_qty,
                    usage_unit: c.usage_unit
                })));
            }
        } catch (err) {
            showToast('خطأ أثناء تحميل المكونات: ' + err.message);
        } finally {
            setLoadingComponents(false);
        }
    };

    const addComponentRow = (e) => {
        e.preventDefault();
        if (!newCompItem || !newCompQty) {
            showToast('اختر الصنف وأدخل الكمية المستخدمة.');
            return;
        }
        const qty = parseFloat(newCompQty);
        if (!qty || qty <= 0) {
            showToast('أدخل كمية مستخدمة صحيحة.');
            return;
        }
        setComponentRows(prev => [...prev, {
            key: `new-${Date.now()}`,
            component_type: newCompType,
            component_id: Number(newCompItem),
            usage_qty: qty,
            usage_unit: newCompUnit
        }]);
        setNewCompItem('');
        setNewCompQty('');
    };

    const removeComponentRow = (key) => {
        setComponentRows(prev => prev.filter(r => r.key !== key));
    };

    const saveComponents = async () => {
        const item = menu.find(m => m.id === expandedComponentsId);
        if (!item) return;
        try {
            if (window.api && window.api.db) {
                await window.api.db.saveProductComponents(item.id, componentRows.map(r => ({
                    component_type: r.component_type,
                    component_id: r.component_id,
                    usage_qty: r.usage_qty,
                    usage_unit: r.usage_unit
                })));
                showToast(`تم حفظ مكونات: ${item.name} ✓`, 'success');
            } else {
                showToast('وضع المعاينة: لا يمكن الحفظ بدون قاعدة البيانات.');
            }
        } catch (err) {
            showToast('خطأ أثناء حفظ المكونات: ' + err.message);
        }
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
                const newCat = { id: ++demoId, name: newCategoryName.trim() };
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
                    id: ++demoId,
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

    // --- Handler Functions: Storage Purchases (مشتريات المخزن) ---
    const refreshPurchases = async () => {
        if (!window.api || !window.api.db) return;
        try {
            const [dbPurchases, dbPayments, dbInv] = await Promise.all([
                window.api.db.getPurchases(),
                window.api.db.getPurchasePayments(),
                window.api.db.getInventory()
            ]);
            setPurchases(dbPurchases || []);
            setPurchasePayments(dbPayments || []);
            setInventory((dbInv || []).map(item => ({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                unit: item.unit,
                lowThreshold: item.low_threshold
            })));
        } catch (err) {
            console.error('Failed to refresh purchases:', err);
        }
    };

    const handleAddPurchase = async (e) => {
        e.preventDefault();
        const qty = parseFloat(newPurchaseQty);
        const cost = Math.ceil(parseFloat(newPurchaseCost));
        const paid = Math.ceil(parseFloat(newPurchasePaid) || 0);
        if (!qty || qty <= 0) { showToast('أدخل كمية صحيحة.'); return; }
        if (isNaN(cost) || cost < 0) { showToast('أدخل التكلفة الإجمالية الصحيحة.'); return; }
        if (isNaN(paid) || paid < 0 || paid > cost) { showToast('المدفوع لا يمكن أن يتجاوز التكلفة الإجمالية.'); return; }

        let inventoryId = null;
        let itemName = '';
        let unit = 'قطعة';

        if (newPurchaseItemId === 'new') {
            if (!newPurchaseName.trim()) { showToast('أدخل اسم الصنف الجديد.'); return; }
            itemName = newPurchaseName.trim();
            unit = newPurchaseUnit;
        } else if (newPurchaseItemId) {
            const inv = inventory.find(i => i.id === Number(newPurchaseItemId));
            if (inv) {
                inventoryId = inv.id;
                itemName = inv.name;
                unit = inv.unit;
            }
        } else {
            showToast('اختر صنفاً من المخزن أو أضف صنفاً جديداً.');
            return;
        }

        try {
            await window.api.db.recordPurchase(inventoryId, itemName, qty, unit, cost, paid, newPurchaseNotes.trim());
            showToast(`تم تسجيل شراء: ${itemName} ✓`, 'success');
            setShowAddPurchaseForm(false);
            setNewPurchaseItemId('');
            setNewPurchaseName('');
            setNewPurchaseQty('');
            setNewPurchaseCost('');
            setNewPurchasePaid('');
            setNewPurchaseNotes('');
            await refreshPurchases();
        } catch (err) {
            showToast('خطأ أثناء تسجيل الشراء: ' + err.message);
        }
    };

    const confirmPayPurchase = async () => {
        if (!payModal) return;
        const amount = Math.ceil(parseFloat(payAmountInput));
        if (isNaN(amount) || amount <= 0) {
            showToast('أدخل مبلغاً صحيحاً.');
            return;
        }
        try {
            await window.api.db.recordPurchasePayment(payModal.purchaseId, amount);
            setPayModal(null);
            setPayAmountInput('');
            showToast('تم تسجيل السداد ✓', 'success');
            await refreshPurchases();
        } catch (err) {
            showToast(err.message);
        }
    };

    const handleDeletePurchase = (purchase) => {
        showConfirm(`حذف عملية شراء "${purchase.item_name}"؟ سيتم تراجع الكمية من المخزون وإلغاء دفعاتها من الإيرادات.`, async () => {
            try {
                await window.api.db.deletePurchase(purchase.id);
                showToast('تم حذف عملية الشراء ✓', 'success');
                await refreshPurchases();
            } catch (err) {
                showToast('خطأ أثناء حذف العملية: ' + err.message);
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
                    id: ++demoId,
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
        const emp = employees.find(e => e.id === id);
        try {
            if (window.api && window.api.db) {
                const res = await window.api.db.togglePaymentStatus(id);
                if (res.alreadyPaidThisMonth) {
                    showToast('تم صرف راتب هذا الموظف لهذا الشهر بالفعل. احذف الدفعة من سجل المدفوعات لإعادة الحالة إلى معلق.');
                    await loadEmployees();
                    return;
                }
                setEmployees(employees.map(e => {
                    if (e.id === id) {
                        return {
                            ...e,
                            paymentStatus: res.paymentStatus,
                            lastPaymentDate: res.lastPaymentDate,
                            bonuses: res.bonuses,
                            deductions: res.deductions
                        };
                    }
                    return e;
                }));
                await loadSalaryPayments();
                showToast(`تم اعتماد صرف راتب "${emp ? emp.name : ''}" وتسجيله في السجل ✓`, 'success');
            } else {
                setEmployees(employees.map(e => {
                    if (e.id === id) {
                        const todayStr = new Date().toISOString().split('T')[0];
                        return {
                            ...e,
                            paymentStatus: 'paid',
                            lastPaymentDate: todayStr,
                            bonuses: 0,
                            deductions: 0
                        };
                    }
                    return e;
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

    const deleteSalaryPayment = async (payment) => {
        showConfirm(`هل أنت متأكد من حذف دفعة راتب "${payment.employee_name}" لشهر ${payment.month_label} (بقيمة ${Number(payment.net_pay).toFixed(2)} جنية)؟ لا يمكن التراجع عن هذا الإجراء.`, async () => {
            try {
                if (window.api && window.api.db) {
                    await window.api.db.deleteSalaryPayment(payment.id);
                }
                setSalaryPayments(prev => prev.filter(p => p.id !== payment.id));
                await loadEmployees();
                showToast('تم حذف الدفعة من السجل بنجاح ✓', 'success');
            } catch (err) {
                console.error('Error deleting salary payment:', err);
                showToast('حدث خطأ أثناء حذف الدفعة: ' + err.message);
            }
        });
    };

    const deleteOrder = async (order, displayIndex) => {
        showConfirm(`هل أنت متأكد من حذف الفاتورة رقم #${displayIndex} (بقيمة ${order.total.toFixed(2)} جنية)؟ لا يمكن التراجع عن هذا الإجراء.`, async () => {
            try {
                if (window.api && window.api.db) {
                    await window.api.db.deleteOrder(order.id);
                    // Deleting/cancelling the receipt returns its ingredients to the
                    // stock — refresh the inventory state so the UI shows the new totals.
                    const dbInv = await window.api.db.getInventory();
                    setInventory((dbInv || []).map(item => ({
                        id: item.id,
                        name: item.name,
                        quantity: item.quantity,
                        unit: item.unit,
                        lowThreshold: item.low_threshold
                    })));
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
                    await loadUserAccounts();
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

    const deleteUserAccount = async (account) => {
        const isSelf = account.username === user.username;
        showConfirm(
            isSelf
                ? 'لا يمكنك حذف حسابك الحالي أثناء تسجيل الدخول.'
                : `هل أنت متأكد من حذف حساب "${account.username}"؟ ستبقى جميع فواتيره وسجلاته محفوظة في قاعدة البيانات ولا تُحذف.`,
            async () => {
                if (isSelf) return;
                try {
                    if (window.api && window.api.db) {
                        const res = await window.api.db.deleteUser(account.id, user.username);
                        if (!res.success) {
                            showToast('فشل حذف الحساب: ' + (res.error || ''));
                            return;
                        }
                    }
                    setUserAccounts(prev => prev.filter(a => a.id !== account.id));
                    showToast(`تم حذف حساب "${account.username}" بنجاح ✓`, 'success');
                } catch (err) {
                    console.error('Error deleting user account:', err);
                    showToast('خطأ أثناء حذف الحساب: ' + err.message);
                }
            }
        );
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

    // Deduct salaries actually paid during the selected period (from salary_payments history)
    const periodSalaryPayments = filterPaymentsByPeriod(salaryPayments, filterMode, selectedYear, selectedMonth, selectedDate, dateFrom, dateTo);
    const totalPaidSalariesInPeriod = periodSalaryPayments.reduce((acc, p) => acc + (p.net_pay || 0), 0);

    // Deduct storage-purchase payments actually made during the same period
    const periodPurchasePayments = filterPaymentsByPeriod(purchasePayments, filterMode, selectedYear, selectedMonth, selectedDate, dateFrom, dateTo);
    const totalPurchasesPaidInPeriod = periodPurchasePayments.reduce((acc, p) => acc + (p.amount || 0), 0);

    const netRevenue = totalRevenue - totalPaidSalariesInPeriod - totalPurchasesPaidInPeriod;

    // Salary payment history derived data
    const availableSalaryYears = (() => {
        const yearsSet = new Set();
        yearsSet.add(new Date().getFullYear());
        salaryPayments.forEach(p => {
            if (p.payment_date) {
                const year = Number(p.payment_date.split('-')[0]);
                if (!isNaN(year)) yearsSet.add(year);
            }
        });
        return Array.from(yearsSet).sort((a, b) => b - a);
    })();

    const filteredSalaryHistory = salaryPayments.filter(p => {
        const searchLower = salaryHistorySearch.trim().toLowerCase();
        const nameMatch = !searchLower || (p.employee_name && p.employee_name.toLowerCase().includes(searchLower));
        let periodMatch = true;
        if (salaryHistoryYear !== 'all') {
            const year = Number(p.payment_date.split('-')[0]);
            if (year !== Number(salaryHistoryYear)) periodMatch = false;
        }
        if (periodMatch && salaryHistoryMonth !== 'all') {
            const month = Number(p.payment_date.split('-')[1]);
            if (month !== Number(salaryHistoryMonth)) periodMatch = false;
        }
        return nameMatch && periodMatch;
    });
    const salaryHistoryTotal = filteredSalaryHistory.reduce((sum, p) => sum + (p.net_pay || 0), 0);

    // Storage purchases derived data
    const availablePurchaseYears = (() => {
        const yearsSet = new Set();
        yearsSet.add(new Date().getFullYear());
        purchases.forEach(p => {
            if (p.purchase_date) {
                const year = Number(p.purchase_date.split('-')[0]);
                if (!isNaN(year)) yearsSet.add(year);
            }
        });
        return Array.from(yearsSet).sort((a, b) => b - a);
    })();

    const filteredPurchases = purchases.filter(p => {
        const searchLower = purchasesSearch.trim().toLowerCase();
        const searchMatch = !searchLower ||
            (p.item_name && p.item_name.toLowerCase().includes(searchLower)) ||
            (p.notes && p.notes.toLowerCase().includes(searchLower));

        const isPaid = p.status === 'paid' || p.balance_due <= 0;
        const statusMatch = purchasesStatus === 'all' ||
            (purchasesStatus === 'paid' ? isPaid : !isPaid);

        let periodMatch = true;
        if (p.purchase_date) {
            const parts = p.purchase_date.split('-').map(Number);
            if (parts.length === 3 && !parts.some(isNaN)) {
                if (purchasesFilterMode === 'year-month') {
                    if (parts[0] !== purchasesYear) periodMatch = false;
                    else if (purchasesMonth !== 'all' && parts[1] !== purchasesMonth) periodMatch = false;
                } else if (purchasesFilterMode === 'range') {
                    if (purchasesDateFrom && p.purchase_date < purchasesDateFrom) periodMatch = false;
                    if (purchasesDateTo && p.purchase_date > purchasesDateTo) periodMatch = false;
                }
            }
        }

        return searchMatch && statusMatch && periodMatch;
    });

    // Outstanding debt is a LIVE liability — always shown in total across ALL purchases
    // (not hidden behind the month filter). "Debts" view shows every unpaid purchase, all-time.
    const globalPurchasesBalance = purchases.reduce((sum, p) => sum + (p.balance_due || 0), 0);
    const unpaidAllPurchases = purchases.filter(p => (p.balance_due || 0) > 0);
    const displayedPurchases = showDebtsOnly ? unpaidAllPurchases : filteredPurchases;

    const purchasesTotalCost = displayedPurchases.reduce((sum, p) => sum + (p.total_cost || 0), 0);
    const purchasesTotalPaid = displayedPurchases.reduce((sum, p) => sum + (p.paid_amount || 0), 0);
    const purchaseBalancePreview = Math.max(0, Math.ceil(parseFloat(newPurchaseCost) || 0) - Math.ceil(parseFloat(newPurchasePaid) || 0));

    return (
        <div className="flex-1 app-bg text-slate-100 flex flex-col p-6 overflow-y-auto scrollbar-right relative" dir="rtl">

            {/* In-app Pay Purchase Modal */}
            {payModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-800 border border-slate-600 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-right" dir="rtl">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-3">
                            <span className="text-emerald-400">{<icons.card size={14} className="inline" />}</span> سداد متبقي عملية شراء
                        </h3>
                        <p className="text-sm text-slate-300 mb-4">
                            {payModal.itemName} — المتبقي: <span className="font-bold text-amber-400">{Math.ceil(payModal.remaining)} جنية</span>
                        </p>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">المبلغ المسدد (جنية)</label>
                        <input
                            type="number"
                            step="1"
                            min="1"
                            max={Math.ceil(payModal.remaining)}
                            value={payAmountInput}
                            onChange={(e) => setPayAmountInput(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-center mb-4"
                        />
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => { setPayModal(null); setPayAmountInput(''); }}
                                className="px-5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-sm transition cursor-pointer"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={confirmPayPurchase}
                                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition cursor-pointer"
                            >
                                تأكيد السداد
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* 1. Header & Title Banner */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-100 flex items-center gap-2 tracking-tight">
                        <span className="text-emerald-400 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20"><icons.gauge size={20} /></span>
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
                                ? 'bg-surface-3 text-emerald-400 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <icons.menu size={16} className="inline" /> إدارة القائمة
                    </button>
                    <button
                        onClick={() => setActiveTab('inventory')}
                        className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${
                            activeTab === 'inventory'
                                ? 'bg-surface-3 text-emerald-400 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <icons.package size={16} className="inline" /> تتبع المخزون
                    </button>
                    <button
                        onClick={() => setActiveTab('salaries')}
                        className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${
                            activeTab === 'salaries'
                                ? 'bg-surface-3 text-emerald-400 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <icons.wallet size={16} className="inline" /> رواتب الموظفين
                    </button>
                    <button
                        onClick={handleSelectReportsTab}
                        className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${
                            activeTab === 'reports'
                                ? 'bg-surface-3 text-emerald-400 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <icons.clipboard size={16} className="inline" /> سجل الفواتير والتقارير
                    </button>
                </div>
            </div>

            {/* 2. Top Metrics Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
                {/* Metric 1 */}
                <div className="bg-gradient-to-br from-slate-800 to-surface-2 border border-slate-700/60 p-5 rounded-2xl shadow-lg shadow-slate-950/20 hover:border-emerald-500/40 transition-all duration-200 flex items-center justify-between">
                    <div>
                        <span className="text-xs text-slate-400 font-bold block mb-1">أصناف القائمة النشطة</span>
                        <span className="text-3xl font-extrabold text-white">{totalMenuItems}</span>
                    </div>
                    <span className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400"><icons.menu size={28} /></span>
                </div>

                {/* Metric 2 */}
                <div className="bg-gradient-to-br from-slate-800 to-surface-2 border border-slate-700/60 p-5 rounded-2xl shadow-lg shadow-slate-950/20 hover:border-emerald-500/40 transition-all duration-200 flex items-center justify-between">
                    <div>
                        <span className="text-xs text-slate-400 font-bold block mb-1">نقص في المخزون (تنبيه)</span>
                        <span className={`text-3xl font-extrabold ${lowStockItemsCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {lowStockItemsCount}
                        </span>
                    </div>
                    <span className={`p-3 rounded-xl ${lowStockItemsCount > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-700/55 text-slate-400'}`}>
                            <icons.warning size={28} />
                        </span>
                </div>

                {/* Metric 3 */}
                <div className="bg-gradient-to-br from-slate-800 to-surface-2 border border-slate-700/60 p-5 rounded-2xl shadow-lg shadow-slate-950/20 hover:border-emerald-500/40 transition-all duration-200 flex items-center justify-between">
                    <div>
                        <span className="text-xs text-slate-400 font-bold block mb-1">
                            إيرادات الفترة المحددة
                        </span>
                        <span className={`text-3xl font-extrabold font-mono ${netRevenue < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {netRevenue.toFixed(2)} <span className="text-xs font-normal text-slate-400">جنية</span>
                        </span>
                        {totalPaidSalariesInPeriod > 0 && (
                            <span className="text-xs text-slate-500 block mt-1">بعد خصم رواتب الفترة: {totalPaidSalariesInPeriod.toFixed(2)}</span>
                        )}
                        {totalPurchasesPaidInPeriod > 0 && (
                            <span className="text-xs text-slate-500 block mt-1">بعد خصم مشتريات المخزن: {totalPurchasesPaidInPeriod.toFixed(2)}</span>
                        )}
                    </div>
                    <span className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400"><icons.trending size={28} /></span>
                </div>

                {/* Metric 4 */}
                <div className="bg-gradient-to-br from-slate-800 to-surface-2 border border-slate-700/60 p-5 rounded-2xl shadow-lg shadow-slate-950/20 hover:border-emerald-500/40 transition-all duration-200 flex items-center justify-between">
                    <div>
                        <span className="text-xs text-slate-400 font-bold block mb-1">
                            فواتير الفترة المحددة
                        </span>
                        <span className="text-3xl font-extrabold text-white font-mono">{totalOrdersCount}</span>
                    </div>
                    <span className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400"><icons.receipt size={28} /></span>
                </div>
            </div>

            {/* 3. Tab Sub-Views Content Area */}
            <div className="flex-1 bg-slate-800/40 border border-slate-700/55 rounded-2xl p-6 shadow-xl backdrop-blur-md">
                
                {/* ==================== TAB 1: MENU MANAGEMENT ==================== */}
                {activeTab === 'menu' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-700/60 pb-4">
                            <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                                <span className="text-emerald-400"><icons.menu size={18} /></span> إدارة قائمة المأكولات والمشروبات
                            </h3>
                            {/* Search bar + category filter */}
                            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                <input
                                    type="text"
                                    placeholder="ابحث عن صنف معين..."
                                    value={menuSearch}
                                    onChange={(e) => setMenuSearch(e.target.value)}
                                    className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-right flex-1 min-w-40"
                                />
                                <select
                                    value={menuCategoryFilter}
                                    onChange={(e) => setMenuCategoryFilter(e.target.value)}
                                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-right cursor-pointer"
                                >
                                    <option value="">كل الفئات</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
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
                                                step="1"
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
                                    <h4 className="font-bold text-sm text-slate-300 flex items-center gap-1.5"><icons.boxes size={14} className="inline" /> إدارة الفئات</h4>
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
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-right">
                                        {categories.length === 0 && (
                                            <EmptyState icon={Boxes} title="لا توجد فئات" message="لا توجد فئات. أضف فئة جديدة." />
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
                            <div className="lg:col-span-2 bg-slate-800 border border-slate-700/60 rounded-xl overflow-hidden shadow-sm flex flex-col min-h-0">
                                <div className={cx(tableWrap, 'max-h-[70vh] overflow-y-auto scrollbar-right')}>
                                    <table className="w-full text-right border-collapse">
                                        <thead className={theadClass}>
                                            <tr className="bg-slate-700/50 text-slate-300 border-b border-slate-700 text-sm">
                                                <th className={thClass}>اسم الوجبة/الصنف</th>
                                                <th className={cx(thClass, 'text-center')}>الفئة</th>
                                                <th className={cx(thClass, 'text-center')}>السعر</th>
                                                <th className={cx(thClass, 'text-center')}>الإجراءات</th>
                                            </tr>
                                        </thead>
                                        <tbody className={tbodyClass}>
                                            {menu
                                                .filter(item => menuCategoryFilter === '' || item.category === menuCategoryFilter)
                                                .filter(item => item.name.toLowerCase().includes(menuSearch.toLowerCase()))
                                                .map((item) => (
                                                    <Fragment key={item.id}>
                                                        <tr className={rowClass}>
                                                            <td className={cx(tdClass, 'font-bold text-white')}>{item.name}</td>
                                                            <td className={cx(tdClass, 'text-center')}>
                                                                <span className="bg-slate-900/60 px-3 py-1 rounded-full text-xs font-semibold text-slate-300 border border-slate-700/50">
                                                                    {item.category}
                                                                </span>
                                                            </td>
                                                            <td className={cx(tdClass, 'text-center font-extrabold text-emerald-400')}>{item.price.toFixed(2)} جنية</td>
                                                            <td className={cx(tdClass, 'text-center')}>
                                                                <div className="flex flex-wrap items-center justify-center gap-2">
                                                                    <button
                                                                        onClick={() => toggleComponents(item)}
                                                                        className={`px-3 py-1.5 rounded-lg transition text-xs font-bold cursor-pointer border ${
                                                                            expandedComponentsId === item.id
                                                                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                                                                : 'bg-slate-900/60 border-slate-600 text-slate-300 hover:bg-slate-800'
                                                                        }`}
                                                                        title="ربط المواد الخام المستهلكة لهذا الصنف"
                                                                    >
                                                                        {<icons.settings size={14} className="inline" />} المكونات
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteMenuItem(item.id)}
                                                                        className="text-rose-400 hover:text-rose-350 hover:bg-rose-500/10 px-3 py-1.5 rounded-lg transition text-xs font-bold cursor-pointer"
                                                                    >
                                                                        حذف {<icons.trash size={14} className="inline" />}
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        {expandedComponentsId === item.id && (
                                                            <tr className="bg-slate-900/60 border-t border-slate-700/40">
                                                                <td colSpan="4" className="p-4">
                                                                    <div className="bg-surface-1 border border-slate-700/60 rounded-xl p-4 space-y-3">
                                                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                                                            <h5 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
                                                                                {<icons.settings size={14} className="inline" />} مكونات: {item.name}
                                                                            </h5>
                                                                            <div className="flex items-center gap-2">
                                                                                <button
                                                                                    onClick={saveComponents}
                                                                                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-1.5 rounded-lg transition text-xs cursor-pointer"
                                                                                >
                                                                                    {<icons.save size={14} className="inline" />} حفظ المكونات
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => toggleComponents(item)}
                                                                                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-3 py-1.5 rounded-lg transition text-xs cursor-pointer border border-slate-600"
                                                                                >
                                                                                    إغلاق ✕
                                                                                </button>
                                                                            </div>
                                                                        </div>

                                                                        <p className="text-[11px] text-slate-500 leading-relaxed">
                                                                            تُخصم هذه المكونات تلقائياً من المخزن عند كل عملية بيع لهذا الصنف.
                                                                            الوزن يُحوَّل تلقائياً (مثال: 100 جرام → 0.1 كجم). اضغط "حفظ المكونات" لتطبيق التغييرات.
                                                                        </p>

                                                                        {loadingComponents && (
                                                                            <p className="text-xs text-slate-400">جاري تحميل المكونات...</p>
                                                                        )}

                                                                        {!loadingComponents && componentRows.length === 0 && (
                                                                            <p className="text-xs text-slate-500 bg-slate-900/40 border border-slate-700/40 rounded-lg px-3 py-2">
                                                                                لا توجد مكونات مرتبطة بهذا الصنف — أضف مكونات من الأسفل.
                                                                            </p>
                                                                        )}

                                                                        {!loadingComponents && componentRows.length > 0 && (
                                                                            <div className="space-y-1.5">
                                                                                {componentRows.map(row => {
                                                                                    const info = resolveComponentInfo(row);
                                                                                    return (
                                                                                        <div key={row.key} className="flex items-center justify-between gap-2 bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-xs">
                                                                                            <div className="flex flex-wrap items-center gap-2">
                                                                                                <span className="font-bold text-slate-200">{info.name}</span>
                                                                                                <span className="text-emerald-400 font-mono font-bold">
                                                                                                    {row.usage_qty} {row.usage_unit}
                                                                                                </span>
                                                                                                <span className="text-[10px] text-slate-500">لكل وحدة مباعة</span>
                                                                                            </div>
                                                                                            <div className="flex items-center gap-2">
                                                                                                {info.stock !== null && (
                                                                                                    <span className={`px-2 py-0.5 rounded font-mono font-bold border ${
                                                                                                        info.low
                                                                                                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                                                                                            : 'bg-slate-800 border-slate-600 text-slate-300'
                                                                                                    }`}>
                                                                                                        {info.low && <icons.warning size={12} className="inline" />}المخزون: {info.stock} {info.unit}
                                                                                                    </span>
                                                                                                )}
                                                                                                <button
                                                                                                    onClick={() => removeComponentRow(row.key)}
                                                                                                    className="text-rose-400 hover:text-rose-300 px-1.5 py-0.5 rounded hover:bg-rose-500/10 cursor-pointer"
                                                                                                    title="إزالة المكون"
                                                                                                >
                                                                                                    ✕
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        )}

                                                                        {/* Add Component Form */}
                                                                        <form onSubmit={addComponentRow} className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end pt-1 border-t border-slate-700/40">
                                                                            <div>
                                                                                <label className="block text-[11px] font-bold text-slate-400 mb-1">النوع</label>
                                                                                <select
                                                                                    value={newCompType}
                                                                                    onChange={(e) => { setNewCompType(e.target.value); setNewCompItem(''); }}
                                                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                                                                >
                                                                                    <option value="inventory">من المخزن</option>
                                                                                    <option value="menu">من القائمة</option>
                                                                                </select>
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-[11px] font-bold text-slate-400 mb-1">الصنف</label>
                                                                                <select
                                                                                    required
                                                                                    value={newCompItem}
                                                                                    onChange={(e) => setNewCompItem(e.target.value)}
                                                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                                                                >
                                                                                    <option value="">-- اختر --</option>
                                                                                    {(newCompType === 'inventory' ? inventory : menu.filter(m => m.id !== item.id)).map(opt => (
                                                                                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                                                                                    ))}
                                                                                </select>
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-[11px] font-bold text-slate-400 mb-1">الكمية المستخدمة</label>
                                                                                <input
                                                                                    type="number"
                                                                                    required
                                                                                    min="1"
                                                                                    step="1"
                                                                                    value={newCompQty}
                                                                                    onChange={(e) => setNewCompQty(e.target.value)}
                                                                                    placeholder="1"
                                                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-center"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-[11px] font-bold text-slate-400 mb-1">الوحدة</label>
                                                                                <select
                                                                                    value={newCompUnit}
                                                                                    onChange={(e) => setNewCompUnit(e.target.value)}
                                                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-center"
                                                                                >
                                                                                    {COMPONENT_UNITS.map(u => (
                                                                                        <option key={u} value={u}>{u}</option>
                                                                                    ))}
                                                                                </select>
                                                                            </div>
                                                                            <button
                                                                                type="submit"
                                                                                className="bg-slate-700 hover:bg-slate-600 text-emerald-400 font-bold px-3 py-2 rounded-lg transition text-xs cursor-pointer border border-slate-600 whitespace-nowrap"
                                                                            >
                                                                                + إضافة مكون
                                                                            </button>
                                                                        </form>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </Fragment>
                                                ))}
                                            {menu.length === 0 && (
                                                <tr>
                                                    <td colSpan="4" className="p-0">
                                                        <EmptyState icon={PackageX} title="لا توجد أصناف" message="لا يوجد أصناف في القائمة حالياً." />
                                                    </td>
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
                                    <span className="text-emerald-400"><icons.package size={18} /></span> مراقبة مستويات المخزون والمواد الأولية
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
                            <form onSubmit={handleAddInventory} className="bg-surface-1 border border-slate-700/65 rounded-xl p-5 shadow-inner grid grid-cols-1 md:grid-cols-4 gap-4 items-end animate-fadeIn">
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
                            <div className={tableWrap}>
                                <table className="w-full text-right border-collapse">
                                    <thead className={theadClass}>
                                        <tr className="bg-slate-700/50 text-slate-300 border-b border-slate-700 text-sm">
                                            <th className={thClass}>اسم المادة الخام</th>
                                            <th className={cx(thClass, 'text-center')}>الكمية المتوفرة</th>
                                            <th className={cx(thClass, 'text-center')}>الحد الأدنى للتنبيه</th>
                                            <th className={cx(thClass, 'text-center')}>حالة المخزون</th>
                                            <th className={cx(thClass, 'text-center')}>تحديث سريع للرصيد</th>
                                            <th className={cx(thClass, 'text-center')}>إجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className={tbodyClass}>
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
                                                        مخزون منخفض {<icons.warning size={15} className="inline" />}
                                                    </span>
                                                );
                                            }

                                            return (
                                                <tr key={item.id} className={rowClass}>
                                                    <td className={cx(tdClass, 'font-bold text-white')}>{item.name}</td>
                                                    <td className={cx(tdClass, 'text-center font-mono text-base font-black')}>
                                                        {item.quantity} {item.unit}
                                                    </td>
                                                    <td className={cx(tdClass, 'text-center text-slate-400')}>
                                                        {item.lowThreshold} {item.unit}
                                                    </td>
                                                    <td className={cx(tdClass, 'text-center')}>
                                                        {statusBadge}
                                                    </td>
                                                    <td className={cx(tdClass, 'text-center')}>
                                                        <div className="flex justify-center items-center gap-1.5">
                                                            <button
                                                                onClick={() => adjustStock(item.id, -5)}
                                                                className="bg-slate-700 hover:bg-surface-4 text-slate-300 w-8 h-8 rounded-lg font-bold flex items-center justify-center transition cursor-pointer text-xs"
                                                                title="استهلاك 5 وحدات"
                                                            >
                                                                -5
                                                            </button>
                                                            <button
                                                                onClick={() => adjustStock(item.id, -1)}
                                                                className="bg-slate-700 hover:bg-surface-4 text-slate-300 w-8 h-8 rounded-lg font-bold flex items-center justify-center transition cursor-pointer text-xs"
                                                                title="استهلاك وحدة واحدة"
                                                            >
                                                                -1
                                                            </button>
                                                            <button
                                                                onClick={() => adjustStock(item.id, 1)}
                                                                className="bg-slate-700 hover:bg-surface-4 text-slate-300 w-8 h-8 rounded-lg font-bold flex items-center justify-center transition cursor-pointer text-xs"
                                                                title="توريد وحدة واحدة"
                                                            >
                                                                +1
                                                            </button>
                                                            <button
                                                                onClick={() => adjustStock(item.id, 5)}
                                                                className="bg-slate-700 hover:bg-surface-4 text-slate-300 w-8 h-8 rounded-lg font-bold flex items-center justify-center transition cursor-pointer text-xs"
                                                                title="توريد 5 وحدات"
                                                            >
                                                                +5
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className={cx(tdClass, 'text-center')}>
                                                        <button
                                                            onClick={() => deleteInventoryItem(item.id)}
                                                            className="text-rose-400 hover:text-rose-350 hover:bg-rose-500/10 px-3 py-1 rounded-lg text-xs transition font-bold cursor-pointer"
                                                        >
                                                            إزالة {<icons.trash size={14} className="inline" />}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* ==================== PURCHASES: مشتريات المخزن ==================== */}
                        <div className="bg-slate-800 border border-slate-700/60 rounded-xl overflow-hidden shadow-sm">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-700/60 px-5 py-4">
                                <div>
                                    <h4 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                                        <span className="text-emerald-400"><icons.cart size={18} /></span> مشتريات المخزن
                                    </h4>
                                    <p className="text-xs text-slate-400 mt-1">تسجيل شراء المواد الخام: يضيف الكمية للمخزن، يخصم المدفوع من الإيرادات، ويتتبع المتبقي للمورد.</p>
                                </div>
                                <button
                                    onClick={() => setShowAddPurchaseForm(!showAddPurchaseForm)}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-xl transition text-sm cursor-pointer shadow shadow-emerald-950/40"
                                >
                                    {showAddPurchaseForm ? 'إغلاق النموذج' : 'تسجيل عملية شراء +'}
                                </button>
                            </div>

                            {/* Add Purchase Form */}
                            {showAddPurchaseForm && (
                                <form onSubmit={handleAddPurchase} className="bg-surface-1 border-b border-slate-700/60 p-5 space-y-4 animate-fadeIn">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className={newPurchaseItemId === 'new' ? '' : 'md:col-span-2'}>
                                            <label className="block text-xs font-bold text-slate-300 mb-1.5">الصنف المشترى</label>
                                            <select
                                                value={newPurchaseItemId}
                                                onChange={(e) => setNewPurchaseItemId(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                            >
                                                <option value="">-- اختر من المخزن أو أضف جديد --</option>
                                                {inventory.map(i => (
                                                    <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                                                ))}
                                                <option value="new">+ صنف جديد</option>
                                            </select>
                                        </div>
                                        {newPurchaseItemId === 'new' && (
                                            <>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم الصنف الجديد</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={newPurchaseName}
                                                        onChange={(e) => setNewPurchaseName(e.target.value)}
                                                        placeholder="مثال: بطاطس بلدي"
                                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-right"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-300 mb-1.5">الوحدة</label>
                                                    <select
                                                        value={newPurchaseUnit}
                                                        onChange={(e) => setNewPurchaseUnit(e.target.value)}
                                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-center"
                                                    >
                                                        <option value="كجم">كجم</option>
                                                        <option value="قطعة">قطعة</option>
                                                        <option value="لتر">لتر</option>
                                                        <option value="صندوق">صندوق</option>
                                                    </select>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-300 mb-1.5">الكمية المشتراة</label>
                                            <input
                                                type="number"
                                                required
                                                min="1"
                                                step="1"
                                                value={newPurchaseQty}
                                                onChange={(e) => setNewPurchaseQty(e.target.value)}
                                                placeholder="7"
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-center"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-300 mb-1.5">التكلفة الإجمالية (جنية)</label>
                                            <input
                                                type="number"
                                                required
                                                min="0"
                                                step="1"
                                                value={newPurchaseCost}
                                                onChange={(e) => setNewPurchaseCost(e.target.value)}
                                                placeholder="5000"
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-center"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-300 mb-1.5">المدفوع الآن (جنية)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                value={newPurchasePaid}
                                                onChange={(e) => setNewPurchasePaid(e.target.value)}
                                                placeholder="1000"
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-center"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-300 mb-1.5">ملاحظات (اختياري)</label>
                                            <input
                                                type="text"
                                                value={newPurchaseNotes}
                                                onChange={(e) => setNewPurchaseNotes(e.target.value)}
                                                placeholder="المورد / رقم الفاتورة..."
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-right"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-2 text-xs">
                                            <span className="text-slate-400">المتبقي بعد الدفع: </span>
                                            <span className="font-bold font-mono text-amber-400">
                                                {purchaseBalancePreview.toFixed(2)} جنية
                                            </span>
                                        </div>
                                        <button
                                            type="submit"
                                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-5 rounded-lg transition text-sm cursor-pointer shadow shadow-emerald-950/40"
                                        >
                                            {<icons.save size={14} className="inline" />} تسجيل عملية الشراء
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Outstanding debt banner + visibility toggle */}
                            {globalPurchasesBalance > 0 && (
                                <div className="bg-amber-500/10 border border-amber-500/30 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                                    <p className="text-sm font-bold text-amber-400 flex items-center gap-2">
                                        <span className="text-lg">{<icons.warning size={15} className="inline" />}</span>
                                        لديك {Math.ceil(globalPurchasesBalance)} جنية مستحقة للموردين
                                        {showDebtsOnly ? '' : ` (${unpaidAllPurchases.length} عملية غير مسددة)`}.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setShowDebtsOnly(v => !v)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                                            showDebtsOnly ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700'
                                        }`}
                                    >
                                        {showDebtsOnly ? 'إغلاق و عرض كل المشتريات' : 'عرض الديون المستحقة فقط'}
                                    </button>
                                </div>
                            )}

                            {!showDebtsOnly ? (
                            <div className="border-b border-slate-700/60 px-5 py-4 space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <input
                                        type="text"
                                        placeholder="ابحث عن صنف أو مورد..."
                                        value={purchasesSearch}
                                        onChange={(e) => setPurchasesSearch(e.target.value)}
                                        className="bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-right"
                                    />
                                    <select
                                        value={purchasesStatus}
                                        onChange={(e) => setPurchasesStatus(e.target.value)}
                                        className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer text-center"
                                    >
                                        <option value="all">كل الحالات</option>
                                        <option value="paid">مدفوع</option>
                                        <option value="partial">مستحق</option>
                                    </select>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => { setPurchasesFilterMode('year-month'); setPurchasesDateFrom(''); setPurchasesDateTo(''); }}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                                                purchasesFilterMode === 'year-month'
                                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-surface-3'
                                            }`}
                                        >
                                            📅 بالشهر
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPurchasesFilterMode('range')}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                                                purchasesFilterMode === 'range'
                                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-surface-3'
                                            }`}
                                        >
                                            📆 بفترة
                                        </button>
                                    </div>
                                </div>

                                {purchasesFilterMode === 'year-month' ? (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-xs font-bold text-slate-400">الفترة:</span>
                                        <select
                                            value={purchasesYear}
                                            onChange={(e) => setPurchasesYear(Number(e.target.value))}
                                            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer text-center"
                                        >
                                            {availablePurchaseYears.map(year => (
                                                <option key={year} value={year}>{year}</option>
                                            ))}
                                        </select>
                                        <select
                                            value={purchasesMonth}
                                            onChange={(e) => setPurchasesMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                                            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer text-center"
                                        >
                                            <option value="all">كل الشهور</option>
                                            {ARABIC_MONTH_LABELS.map((label, idx) => (
                                                <option key={idx} value={idx + 1}>{label}</option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-xs font-bold text-slate-400">من:</span>
                                        <input
                                            type="date"
                                            value={purchasesDateFrom}
                                            onChange={(e) => setPurchasesDateFrom(e.target.value)}
                                            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer text-center [color-scheme:dark] text-slate-200"
                                        />
                                        <span className="text-xs text-slate-500">إلى:</span>
                                        <input
                                            type="date"
                                            value={purchasesDateTo}
                                            onChange={(e) => setPurchasesDateTo(e.target.value)}
                                            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer text-center [color-scheme:dark] text-slate-200"
                                        />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="border-b border-slate-700/60 px-5 py-4 flex items-center gap-2 text-sm text-slate-300">
                                عرض: <span className="font-bold text-amber-400">الديون المستحقة فقط</span> — كل المشتريات غير المسددة من كل الفترات (يتم تجاهل الفترة الزمنية).
                            </div>
                        )}

                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-5 py-4">
                                <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-slate-400 font-bold">إجمالي المشتريات</p>
                                        <h4 className="text-xl font-black text-white font-mono mt-1">{Math.ceil(purchasesTotalCost)}</h4>
                                        <p className="text-[10px] text-slate-500">جنية</p>
                                    </div>
                                    <span className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-lg">{<icons.receipt size={20} className="inline" />}</span>
                                </div>
                                <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-slate-400 font-bold">المدفوع فعلياً</p>
                                        <h4 className="text-xl font-black text-emerald-400 font-mono mt-1">{Math.ceil(purchasesTotalPaid)}</h4>
                                        <p className="text-[10px] text-slate-500">جنية (مخصوم من الإيرادات)</p>
                                    </div>
                                    <span className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-lg">{<icons.cash size={20} className="inline" />}</span>
                                </div>
                                <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-slate-400 font-bold">المتبقي مستحق للمورد</p>
                                        <h4 className="text-xl font-black text-amber-400 font-mono mt-1">{Math.ceil(globalPurchasesBalance)}</h4>
                                        <p className="text-[10px] text-slate-500">جنية (كل الفترات — لم يُخصم بعد)</p>
                                    </div>
                                    <span className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-lg">{<icons.clock size={15} className="inline" />}</span>
                                </div>
                            </div>

                            {/* Purchases Table */}
                            <div className={tableWrap}>
                                <table className="w-full text-right border-collapse">
                                    <thead className={theadClass}>
                                        <tr className="bg-slate-700/50 text-slate-300 border-t border-slate-700 text-sm">
                                            <th className={thClass}>الصنف</th>
                                            <th className={cx(thClass, 'text-center')}>الكمية</th>
                                            <th className={cx(thClass, 'text-center')}>التكلفة</th>
                                            <th className={cx(thClass, 'text-center')}>المدفوع</th>
                                            <th className={cx(thClass, 'text-center')}>المتبقي</th>
                                            <th className={cx(thClass, 'text-center')}>التاريخ</th>
                                            <th className={cx(thClass, 'text-center')}>الحالة</th>
                                            <th className={cx(thClass, 'text-center')}>إجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className={tbodyClass}>
                                        {displayedPurchases.map(p => {
                                            const isPaid = p.status === 'paid' || p.balance_due <= 0;
                                            return (
                                                <tr key={p.id} className={rowClass}>
                                                    <td className={cx(tdClass, 'font-bold text-white')}>{p.item_name}</td>
                                                    <td className={cx(tdClass, 'text-center font-mono text-slate-300')}>{p.quantity} {p.unit}</td>
                                                    <td className={cx(tdClass, 'text-center font-mono text-slate-300')}>{Math.ceil(p.total_cost)} جنية</td>
                                                    <td className={cx(tdClass, 'text-center font-mono text-emerald-400')}>{Math.ceil(p.paid_amount || 0)} جنية</td>
                                                    <td className={cx(tdClass, 'text-center font-mono font-bold text-amber-400')}>{Math.ceil(p.balance_due || 0)} جنية</td>
                                                    <td className={cx(tdClass, 'text-center text-slate-400')}>{formatPaymentDate(p.purchase_date)}</td>
                                                    <td className={cx(tdClass, 'text-center')}>
                                                        {isPaid ? (
                                                            <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold">مدفوع {<icons.check size={13} className="inline" />}</span>
                                                        ) : (
                                                            <span className="bg-amber-500/15 border border-amber-500/30 text-amber-400 px-3 py-1 rounded-full text-xs font-bold">مستحق {<icons.warning size={15} className="inline" />}</span>
                                                        )}
                                                    </td>
                                                    <td className={cx(tdClass, 'text-center')}>
                                                        <div className="flex items-center justify-center gap-2">
                                                            {!isPaid && (
                                                                <button
                                                                    onClick={() => { setPayModal({ purchaseId: p.id, itemName: p.item_name, remaining: p.balance_due }); setPayAmountInput(String(Math.ceil(p.balance_due))); }}
                                                                    className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold px-3 py-1.5 rounded-xl transition text-xs cursor-pointer"
                                                                >
                                                                    {<icons.card size={14} className="inline" />} سداد
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleDeletePurchase(p)}
                                                                className="text-rose-400 hover:text-rose-350 hover:bg-rose-500/10 px-3 py-1.5 rounded-lg transition text-xs font-bold cursor-pointer"
                                                            >
                                                                حذف {<icons.trash size={14} className="inline" />}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {displayedPurchases.length === 0 && (
                                            <tr>
                                                <td colSpan="8" className="p-0">
                                                    {showDebtsOnly
                                                        ? <div className="text-center p-8 text-slate-500">🎉 لا توجد ديون مستحقة — كل الموردين مسددون.</div>
                                                        : purchases.length === 0
                                                            ? <EmptyState icon={Package} title="لا توجد مشتريات" message="لا توجد مشتريات مسجلة بعد." />
                                                            : <EmptyState icon={SearchX} title="لا توجد نتائج" message="لا توجد مشتريات تطابق الفلترة أو البحث الحالي." />}
                                                </td>
                                            </tr>
                                        )}
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
                                    <span className="text-emerald-400"><icons.wallet size={18} /></span> إدارة مستحقات الكادر الوظيفي والرواتب
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">تحديد وحساب الحوافز الشهرية، الخصومات التأديبية، واعتماد تسليم الراتب.</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setShowAddUserForm(!showAddUserForm); setShowAddEmpForm(false); }}
                                    className="bg-surface-3 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-2 px-4 rounded-xl transition text-sm cursor-pointer shadow shadow-slate-950/40"
                                >
                                    {showAddUserForm ? 'إغلاق نموذج الحسابات' : 'تسجيل حساب مستخدم'}
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
                            <form onSubmit={handleAddUser} className="bg-surface-1 border border-slate-700/65 rounded-xl p-5 shadow-inner grid grid-cols-1 md:grid-cols-5 gap-4 items-end animate-fadeIn">
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
                            <form onSubmit={handleAddEmployee} className="bg-surface-1 border border-slate-700/65 rounded-xl p-5 shadow-inner grid grid-cols-1 md:grid-cols-4 gap-4 items-end animate-fadeIn">
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

                        {/* ===== User Accounts Management ===== */}
                        <div className="bg-slate-800 border border-slate-700/60 rounded-xl overflow-hidden shadow-sm">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 px-5 py-4 border-b border-slate-700/60 bg-slate-800">
                                <div className="flex items-center gap-2.5">
                                    <span className="text-slate-200"><icons.user size={20} /></span>
                                    <span className="font-bold text-slate-100">حسابات المستخدمين (الكاشير)</span>
                                    <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full font-bold">
                                        {userAccounts.length} حساب
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500">حذف الحساب لا يحذف فواتير الكاشير وسجلاته المحفوظة.</p>
                            </div>
                            <div className={tableWrap}>
                                <table className="w-full text-right border-collapse whitespace-nowrap">
                                    <thead className={theadClass}>
                                        <tr className="bg-slate-700/50 text-slate-300 border-b border-slate-700 text-sm">
                                            <th className={thClass}>اسم المستخدم</th>
                                            <th className={cx(thClass, 'text-center')}>الصلاحية</th>
                                            <th className={cx(thClass, 'text-center')}>الإجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className={tbodyClass}>
                                        {userAccounts.map(acc => {
                                            const isSelf = acc.username === user.username;
                                            return (
                                                <tr key={acc.id} className={rowClass}>
                                                    <td className={cx(tdClass, 'font-bold text-white')}>
                                                        {acc.username}
                                                        {isSelf && (
                                                            <span className="mr-2 text-[10px] bg-sky-500/15 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full font-bold">أنت</span>
                                                        )}
                                                    </td>
                                                    <td className={cx(tdClass, 'text-center')}>
                                                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                                            acc.role === 'admin'
                                                                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                                                                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                                        }`}>
                                                            {acc.role === 'admin' ? 'مدير النظام' : 'موظف مبيعات (كاشير)'}
                                                        </span>
                                                    </td>
                                                    <td className={cx(tdClass, 'text-center')}>
                                                        <button
                                                            onClick={() => deleteUserAccount(acc)}
                                                            disabled={isSelf}
                                                            className={`${
                                                                isSelf
                                                                    ? 'text-slate-600 cursor-not-allowed'
                                                                    : 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer'
                                                            } px-3 py-1.5 rounded-lg text-xs transition font-bold`}
                                                            title={isSelf ? 'لا يمكنك حذف حسابك الحالي' : 'حذف الحساب (بدون حذف الفواتير)'}
                                                        >
                                                            حذف {<icons.trash size={14} className="inline" />}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {userAccounts.length === 0 && (
                                            <tr>
                                                <td colSpan="3" className="p-0">
                                                    <EmptyState icon={Users} title="لا توجد حسابات" message="لا توجد حسابات مسجلة حالياً." />
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Employees Salary Table */}
                        <div className="bg-slate-800 border border-slate-700/60 rounded-xl overflow-hidden shadow-sm">
                            <div className={tableWrap}>
                                <table className="w-full text-right border-collapse whitespace-nowrap">
                                    <thead className={theadClass}>
                                        <tr className="bg-slate-700/50 text-slate-300 border-b border-slate-700 text-sm">
                                            <th className={thClass}>اسم الموظف / الدور</th>
                                            <th className={cx(thClass, 'text-center')}>الراتب الأساسي</th>
                                            <th className={cx(thClass, 'text-center')}>المكافآت والحوافز</th>
                                            <th className={cx(thClass, 'text-center')}>الاستقطاعات والخصم</th>
                                            <th className={cx(thClass, 'text-center')}>الصافي الكلي</th>
                                            <th className={cx(thClass, 'text-center')}>حالة الصرف</th>
                                            <th className={cx(thClass, 'text-center')}>تاريخ التحويل</th>
                                            <th className={cx(thClass, 'text-center')}>الإجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className={tbodyClass}>
                                        {employees.map((emp) => {
                                            const netPay = calculateNetPay(emp);
                                            return (
                                                <tr key={emp.id} className={rowClass}>
                                                    <td className={cx(tdClass)}>
                                                        <div className="font-bold text-white">{emp.name}</div>
                                                        <div className="text-xs text-slate-400 mt-0.5">{emp.role}</div>
                                                    </td>
                                                    <td className={cx(tdClass, 'text-center font-mono font-bold text-slate-200')}>
                                                        {emp.baseSalary}
                                                    </td>
                                                    <td className={cx(tdClass, 'text-center')}>
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
                                                    <td className={cx(tdClass, 'text-center')}>
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
                                                    <td className={cx(tdClass, 'text-center font-extrabold text-white text-base')}>
                                                        {netPay} <span className="text-xs text-slate-400 font-normal">جنية</span>
                                                    </td>
                                                    <td className={cx(tdClass, 'text-center')}>
                                                        {emp.paymentStatus === 'paid' ? (
                                                            <button
                                                                disabled
                                                                title="تم صرف راتب هذا الموظف لهذا الشهر. احذف الدفعة من سجل المدفوعات لإعادة الحالة إلى معلق."
                                                                className="px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-not-allowed border bg-emerald-500/10 border-emerald-500/35 text-emerald-400 opacity-70"
                                                            >
                                                                تم الصرف هذا الشهر {<icons.check size={13} className="inline" />}
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => togglePaymentStatus(emp.id)}
                                                                title="اعتماد صرف الراتب وتسجيله في سجل المدفوعات"
                                                                className="px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border bg-amber-500/10 border-amber-500/35 text-amber-400 hover:bg-amber-500/20"
                                                            >
                                                                اعتماد الراتب {<icons.clock size={15} className="inline" />}
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td className={cx(tdClass, 'text-center font-mono text-xs text-slate-400')}>
                                                        {emp.lastPaymentDate}
                                                    </td>
                                                    <td className={cx(tdClass, 'text-center')}>
                                                        <button
                                                            onClick={() => deleteEmployee(emp.id)}
                                                            className="text-rose-400 hover:text-rose-350 hover:bg-rose-500/10 px-3 py-1.5 rounded-lg text-xs transition font-bold cursor-pointer"
                                                        >
                                                            إنهاء الخدمة {<icons.trash size={14} className="inline" />}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {employees.length === 0 && (
                                            <tr>
                                                <td colSpan="8" className="p-0">
                                                    <EmptyState icon={Users} title="لا يوجد موظفين" message="لا يوجد موظفين مسجلين حالياً." />
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* ===== Salary Payments History Section ===== */}
                        <div className="bg-slate-800 border border-slate-700/60 rounded-xl overflow-hidden shadow-sm">
                            <button
                                onClick={() => setShowSalaryHistory(!showSalaryHistory)}
                                className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 px-5 py-4 hover:bg-surface-3/40 transition text-right cursor-pointer"
                            >
                                <div className="flex items-center gap-2.5">
                                    <span className="text-emerald-400"><icons.history size={20} /></span>
                                    <span className="font-bold text-slate-100">سجل مدفوعات الرواتب</span>
                                    <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full font-bold">
                                        {salaryPayments.length} عملية مسجلة
                                    </span>
                                </div>
                                <span className="text-slate-400 text-xs font-bold">
                                    {showSalaryHistory
                                        ? <>إخفاء السجل <icons.chevronUp size={14} className="inline" /></>
                                        : <>عرض السجل <icons.chevronDown size={14} className="inline" /></>}
                                </span>
                            </button>

                            {showSalaryHistory && (
                                <div className="border-t border-slate-700/60 p-4 space-y-4 animate-fadeIn">
                                    {/* Filters */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <input
                                            type="text"
                                            placeholder="ابحث باسم الموظف..."
                                            value={salaryHistorySearch}
                                            onChange={(e) => setSalaryHistorySearch(e.target.value)}
                                            className="bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-right"
                                        />
                                        <select
                                            value={salaryHistoryYear}
                                            onChange={(e) => setSalaryHistoryYear(e.target.value)}
                                            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer text-center"
                                        >
                                            <option value="all">كل السنوات</option>
                                            {availableSalaryYears.map(year => (
                                                <option key={year} value={year}>{year}</option>
                                            ))}
                                        </select>
                                        <select
                                            value={salaryHistoryMonth}
                                            onChange={(e) => setSalaryHistoryMonth(e.target.value)}
                                            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer text-center"
                                        >
                                            <option value="all">كل الشهور</option>
                                            {ARABIC_MONTH_LABELS.map((label, idx) => (
                                                <option key={idx} value={idx + 1}>{label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Summary strip */}
                                    <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                                        <div className="flex items-center gap-2 text-slate-300 font-semibold">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                            <span>إجمالي المدفوعات:</span>
                                            <span className="font-mono font-black text-emerald-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                                                {salaryHistoryTotal.toFixed(2)} <span className="text-xs text-slate-400 font-normal">جنية</span>
                                            </span>
                                        </div>
                                        <div className="text-slate-400 font-semibold">
                                            عدد العمليات: <span className="font-mono font-bold text-white">{filteredSalaryHistory.length}</span>
                                        </div>
                                    </div>

                                    {/* History table */}
                                    <div className={tableWrap}>
                                        <table className="w-full text-right border-collapse whitespace-nowrap">
                                            <thead className={theadClass}>
                                                <tr className="bg-slate-700/50 text-slate-300 border-b border-slate-700 text-sm">
                                                    <th className={thClass}>اسم الموظف</th>
                                                    <th className={thClass}>الدور</th>
                                                    <th className={cx(thClass, 'text-center')}>شهر الدفع</th>
                                                    <th className={cx(thClass, 'text-center')}>الراتب الأساسي</th>
                                                    <th className={cx(thClass, 'text-center')}>المكافآت</th>
                                                    <th className={cx(thClass, 'text-center')}>الاستقطاعات</th>
                                                    <th className={cx(thClass, 'text-center')}>الصافي المدفوع</th>
                                                    <th className={cx(thClass, 'text-center')}>تاريخ الدفع</th>
                                                    <th className={cx(thClass, 'text-center')}>الإجراءات</th>
                                                </tr>
                                            </thead>
                                            <tbody className={tbodyClass}>
                                                {filteredSalaryHistory.map(p => (
                                                    <tr key={p.id} className={rowClass}>
                                                        <td className={cx(tdClass, 'font-bold text-white')}>{p.employee_name}</td>
                                                        <td className={cx(tdClass, 'text-slate-400')}>{p.employee_role || '—'}</td>
                                                        <td className={cx(tdClass, 'text-center font-semibold text-slate-300')}>{p.month_label}</td>
                                                        <td className={cx(tdClass, 'text-center font-mono text-slate-200')}>{Number(p.base_salary).toFixed(2)}</td>
                                                        <td className={cx(tdClass, 'text-center font-mono text-emerald-400')}>{Number(p.bonuses).toFixed(2)}</td>
                                                        <td className={cx(tdClass, 'text-center font-mono text-rose-400')}>{Number(p.deductions).toFixed(2)}</td>
                                                        <td className={cx(tdClass, 'text-center font-extrabold text-white')}>
                                                            {Number(p.net_pay).toFixed(2)} <span className="text-xs text-slate-400 font-normal">جنية</span>
                                                        </td>
                                                        <td className={cx(tdClass, 'text-center font-mono text-xs text-slate-400')}>{formatPaymentDate(p.payment_date)}</td>
                                                        <td className={cx(tdClass, 'text-center')}>
                                                            <button
                                                                onClick={() => deleteSalaryPayment(p)}
                                                                className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold px-3 py-1.5 rounded-xl transition text-xs cursor-pointer flex items-center gap-1 mx-auto"
                                                                title="حذف الدفعة"
                                                            >
                                                                <span>{<icons.trash size={14} className="inline" />}</span>
                                                                <span>حذف</span>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {filteredSalaryHistory.length === 0 && (
                                                    <tr>
                                                        <td colSpan="9" className="p-0">
                                                            <EmptyState icon={ReceiptText} title="لا توجد دفعات رواتب" message="لا توجد دفعات رواتب مسجلة تطابق الفلاتر المحددة." />
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ==================== TAB 4: SALES REPORTS & LOGS ==================== */}
                {activeTab === 'reports' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-700/60 pb-4">
                            <div>
                                <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                                    <span className="text-emerald-400"><icons.gauge size={18} /></span> سجل الفواتير والمبيعات التفصيلي
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
                            selectedDate={selectedDate}
                            dateFrom={dateFrom}
                            dateTo={dateTo}
                            onFilterModeChange={setFilterMode}
                            onYearChange={setSelectedYear}
                            onMonthChange={setSelectedMonth}
                            onDateChange={setSelectedDate}
                            onDateFromChange={setDateFrom}
                            onDateToChange={setDateTo}
                        />

                        {/* Filtered Summary Strip */}
                        {(() => {
                            const visibleOrders = periodFilteredOrders.filter(order => {
                                const searchLower = reportsSearch.toLowerCase();
                                return !searchLower ||
                                    (order.cashier && order.cashier.toLowerCase().includes(searchLower)) ||
                                    order.items?.some(item => item.item_name.toLowerCase().includes(searchLower));
                            });
                            const filteredTotal = visibleOrders.reduce((sum, o) => sum + (o.total || 0), 0);
                            return (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-slate-400 font-bold">
                                                {reportsSearch.trim() ? `فواتير "${reportsSearch.trim()}"` : 'إجمالي الفواتير'}
                                            </p>
                                            <h4 className="text-2xl font-black text-white font-mono mt-1">{visibleOrders.length}</h4>
                                        </div>
                                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl">📄</div>
                                    </div>
                                    <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-slate-400 font-bold">
                                                {reportsSearch.trim() ? `مجموع مبيعات "${reportsSearch.trim()}"` : 'إجمالي المبيعات'}
                                            </p>
                                            <h4 className="text-2xl font-black text-emerald-400 font-mono mt-1">
                                                {filteredTotal.toFixed(2)} <span className="text-xs text-slate-400 font-normal">جنية</span>
                                            </h4>
                                        </div>
                                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl">{<icons.cash size={20} className="inline" />}</div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Orders Table */}
                        <div className="bg-slate-800 border border-slate-700/60 rounded-xl overflow-hidden shadow-sm flex flex-col min-h-0">
                            <div className={cx(tableWrap, 'max-h-[60vh] overflow-y-auto scrollbar-right')}>
                                <table className="w-full text-right border-collapse">
                                    <thead className={theadClass}>
                                        <tr className="bg-slate-700/50 text-slate-300 border-b border-slate-700 text-sm">
                                            <th className={thClass}>#</th>
                                            <th className={thClass}>الكاشير المسؤول</th>
                                            <th className={cx(thClass, 'text-center')}>التاريخ والوقت</th>
                                            <th className={cx(thClass, 'text-center')}>إجمالي الفاتورة</th>
                                            <th className={cx(thClass, 'text-center')}>التفاصيل</th>
                                            <th className={cx(thClass, 'text-center')}>الإجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className={tbodyClass}>
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
                                                    <Fragment key={order.id}>
                                                        <tr className={rowClass}>
                                                            <td className={cx(tdClass, 'font-bold text-white font-mono')}>#{displayIndex}</td>
                                                            <td className={cx(tdClass, 'font-bold text-slate-300')}>{order.cashier}</td>
                                                            <td className={cx(tdClass, 'text-center font-mono text-slate-400')}>
                                                                {new Date(order.timestamp).toLocaleString('ar-EG', { hour12: true })}
                                                            </td>
                                                            <td className={cx(tdClass, 'text-center font-extrabold text-emerald-400 font-mono')}>
                                                                {order.total.toFixed(2)} جنية
                                                            </td>
                                                            <td className={cx(tdClass, 'text-center')}>
                                                                <button
                                                                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                                                                    className={cx(
                                                                        'px-3 py-1.5 rounded-lg text-xs transition font-bold cursor-pointer inline-flex items-center gap-1',
                                                                        isExpanded
                                                                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                                                            : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                                                                    )}
                                                                >
                                                                    {isExpanded
                                                                    ? <>إغلاق <icons.chevronUp size={14} /></>
                                                                    : <>عرض الأصناف <icons.chevronDown size={14} /></>}
                                                                </button>
                                                            </td>
                                                            <td className={cx(tdClass, 'text-center')}>
                                                                <button
                                                                    onClick={() => deleteOrder(order, displayIndex)}
                                                                    className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold px-3 py-1.5 rounded-xl transition text-xs cursor-pointer flex items-center gap-1 mx-auto"
                                                                    title="حذف الفاتورة"
                                                                >
                                                                    <span>{<icons.trash size={14} className="inline" />}</span>
                                                                    <span>حذف</span>
                                                                </button>
                                                            </td>
                                                        </tr>

                                                        {isExpanded && (
                                                            <tr className="bg-slate-900/70">
                                                                <td colSpan="6" className="p-4">
                                                                    <div className="rounded-xl border border-slate-700/70 bg-slate-900 overflow-hidden animate-fadeIn">
                                                                        <div className="px-4 py-2.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                                                                            <span className="font-bold text-slate-200 text-sm">أصناف الفاتورة #{displayIndex}</span>
                                                                            <span className="font-mono text-emerald-400 font-extrabold text-sm">الإجمالي {order.total.toFixed(2)} جنية</span>
                                                                        </div>
                                                                        <div className="divide-y divide-slate-800">
                                                                            {order.items?.map((item, idx) => (
                                                                                <div key={idx} className="flex items-center justify-between px-4 py-2 text-sm">
                                                                                    <span className="text-slate-200 font-semibold">{item.item_name}</span>
                                                                                    <span className="flex items-center gap-4">
                                                                                        <span className="text-slate-400 text-xs">× {item.quantity}</span>
                                                                                        <span className="font-mono text-slate-200 w-28 text-left">{(item.price * item.quantity).toFixed(2)} جنية</span>
                                                                                    </span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </Fragment>
                                                );
                                            })}
                                        {periodFilteredOrders.length === 0 && (
                                            <tr>
                                                <td colSpan="6" className="p-0">
                                                    {orders.length === 0
                                                        ? <EmptyState icon={ReceiptText} title="لا توجد فواتير" message="لا يوجد فواتير مسجلة في النظام حالياً." />
                                                        : <EmptyState icon={SearchX} title="لا توجد نتائج" message="لا توجد فواتير تطابق الفترة المحددة أو البحث." />}
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

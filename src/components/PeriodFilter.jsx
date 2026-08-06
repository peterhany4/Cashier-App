import { useState, useMemo, useEffect } from 'react';
import { filterOrdersByPeriod } from './periodFilterUtils';
import icons from './icons';

const ARABIC_MONTHS = [
    { value: 0, label: 'يناير' },
    { value: 1, label: 'فبراير' },
    { value: 2, label: 'مارس' },
    { value: 3, label: 'أبريل' },
    { value: 4, label: 'مايو' },
    { value: 5, label: 'يونيو' },
    { value: 6, label: 'يوليو' },
    { value: 7, label: 'أغسطس' },
    { value: 8, label: 'سبتمبر' },
    { value: 9, label: 'أكتوبر' },
    { value: 10, label: 'نوفمبر' },
    { value: 11, label: 'ديسمبر' },
];

export default function PeriodFilter({
    orders = [],
    onFilterChange,          // legacy: called with (filteredOrders, meta) — kept for backwards compat
    // Controlled mode props (used by AdminDashboardPage to persist state across tab switches)
    filterMode: controlledFilterMode,
    selectedYear: controlledYear,
    selectedMonth: controlledMonth,
    selectedDate: controlledDate,
    dateFrom: controlledDateFrom,
    dateTo: controlledDateTo,
    onFilterModeChange,
    onYearChange,
    onMonthChange,
    onDateChange,
    onDateFromChange,
    onDateToChange,
}) {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    // If controlled props provided, use them; otherwise fall back to internal state
    const isControlled = controlledFilterMode !== undefined;

    const [internalFilterMode, setInternalFilterMode] = useState('year-month');
    const [internalSelectedYear, setInternalSelectedYear] = useState(currentYear);
    const [internalSelectedMonth, setInternalSelectedMonth] = useState(currentMonth);
    const [internalSelectedDate, setInternalSelectedDate] = useState('');
    const [internalDateFrom, setInternalDateFrom] = useState('');
    const [internalDateTo, setInternalDateTo] = useState('');

    const filterMode = isControlled ? controlledFilterMode : internalFilterMode;
    const selectedYear = isControlled ? controlledYear : internalSelectedYear;
    const selectedMonth = isControlled ? controlledMonth : internalSelectedMonth;
    const selectedDate = isControlled ? (controlledDate || '') : internalSelectedDate;
    const dateFrom = isControlled ? (controlledDateFrom || '') : internalDateFrom;
    const dateTo = isControlled ? (controlledDateTo || '') : internalDateTo;

    const setFilterMode = isControlled ? onFilterModeChange : setInternalFilterMode;
    const setSelectedYear = isControlled ? onYearChange : setInternalSelectedYear;
    const setSelectedMonth = isControlled ? onMonthChange : setInternalSelectedMonth;
    const setSelectedDate = isControlled ? onDateChange : setInternalSelectedDate;
    const setDateFrom = isControlled ? onDateFromChange : setInternalDateFrom;
    const setDateTo = isControlled ? onDateToChange : setInternalDateTo;

    // Extract available distinct years from orders
    const availableYears = useMemo(() => {
        const yearsSet = new Set();
        yearsSet.add(currentYear);

        orders.forEach(order => {
            if (order.timestamp) {
                const year = new Date(order.timestamp).getFullYear();
                if (!isNaN(year)) yearsSet.add(year);
            }
        });

        return Array.from(yearsSet).sort((a, b) => b - a);
    }, [orders, currentYear]);

    // Calculate filtered orders
    const filteredOrders = useMemo(() => {
        return filterOrdersByPeriod(orders, filterMode, selectedYear, selectedMonth, selectedDate, dateFrom, dateTo);
    }, [orders, filterMode, selectedYear, selectedMonth, selectedDate, dateFrom, dateTo]);

    // Notify parent component whenever filtered orders change
    useEffect(() => {
        if (onFilterChange) {
            onFilterChange(filteredOrders, {
                filterMode,
                selectedYear,
                selectedMonth
            });
        }
    }, [filteredOrders, filterMode, selectedYear, selectedMonth, onFilterChange]);

    // Handlers
    const handleQuickShortcut = (mode) => {
        setFilterMode(mode);
        // Reset year/month selection when using quick shortcuts
        setSelectedYear(currentYear);
        setSelectedMonth('all');
        // Reset date / range selection
        setSelectedDate('');
        setDateFrom('');
        setDateTo('');
    };

    const handleYearChange = (year) => {
        setSelectedYear(Number(year));
        setFilterMode('year-month');
        setSelectedDate('');
        setDateFrom('');
        setDateTo('');
    };

    const handleMonthChange = (month) => {
        setSelectedMonth(month === 'all' ? 'all' : Number(month));
        setFilterMode('year-month');
        setSelectedDate('');
        setDateFrom('');
        setDateTo('');
    };

    const handleDateChange = (value) => {
        if (!value) {
            setSelectedDate('');
            setFilterMode('all');
            return;
        }
        setSelectedDate(value);
        setFilterMode('date');
        setSelectedMonth('all');
        setDateFrom('');
        setDateTo('');
    };

    const handleDateFromChange = (value) => {
        setDateFrom(value || '');
        if (value) {
            setFilterMode('range');
            setSelectedMonth('all');
            setSelectedDate('');
        } else if (!dateTo) {
            setFilterMode('all');
        }
    };

    const handleDateToChange = (value) => {
        setDateTo(value || '');
        if (value) {
            setFilterMode('range');
            setSelectedMonth('all');
            setSelectedDate('');
        } else if (!dateFrom) {
            setFilterMode('all');
        }
    };

    // Metrics for summary strip
    const filteredTotalRevenue = useMemo(() => {
        return filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    }, [filteredOrders]);

    const formatToDDMMYYYY = (isoDate) => {
        if (!isoDate) return '';
        const [y, m, d] = isoDate.split('-');
        if (!y || !m || !d) return isoDate;
        return `${d}-${m}-${y}`;
    };

    const getPeriodDescription = () => {
        if (filterMode === 'today') return 'مبيعات اليوم';
        if (filterMode === 'week') return 'مبيعات هذا الأسبوع';
        if (filterMode === 'all') return 'جميع الفواتير (كل الأوقات)';
        if (filterMode === 'date') {
            return selectedDate ? `مبيعات يوم ${formatToDDMMYYYY(selectedDate)}` : 'مبيعات يوم محدد';
        }
        if (filterMode === 'range') {
            const from = dateFrom ? formatToDDMMYYYY(dateFrom) : 'البداية';
            const to = dateTo ? formatToDDMMYYYY(dateTo) : 'النهاية';
            return `مبيعات من ${from} إلى ${to}`;
        }
        if (filterMode === 'year-month') {
            const yearStr = selectedYear.toString();
            if (selectedMonth === 'all') return `إجمالي عام ${yearStr}`;
            const monthObj = ARABIC_MONTHS.find(m => m.value === selectedMonth);
            return `شهر ${monthObj ? monthObj.label : ''} ${yearStr}`;
        }
        return 'الفترة المحددة';
    };

    return (
        <div className="bg-surface-1 border border-slate-700/70 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg backdrop-blur-md">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                
                {/* 1. Quick Shortcuts */}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1 ml-1">
                        <span><icons.zap size={13} className="inline" /></span> الوصول السريع:
                    </span>
                    <button
                        type="button"
                        onClick={() => handleQuickShortcut('today')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                            filterMode === 'today'
                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow'
                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-surface-3'
                        }`}
                    >
                        <icons.calendar size={14} className="inline" /> اليوم
                    </button>
                    <button
                        type="button"
                        onClick={() => handleQuickShortcut('week')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                            filterMode === 'week'
                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow'
                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-surface-3'
                        }`}
                    >
                        <icons.history size={14} className="inline" /> هذا الأسبوع
                    </button>
                    <button
                        type="button"
                        onClick={() => handleQuickShortcut('all')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                            filterMode === 'all'
                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow'
                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-surface-3'
                        }`}
                    >
                        <icons.infinity size={14} className="inline" /> كل الأوقات
                    </button>
                </div>

                {/* 2. Historical Year + Month Picker */}
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1 ml-1">
                        <span><icons.calendarRange size={13} className="inline" /></span> تصفية تاريخية:
                    </span>
                    
                    {/* Year Dropdown */}
                    <div className="relative">
                        <select
                            value={selectedYear}
                            onChange={(e) => handleYearChange(e.target.value)}
                            className={`bg-slate-900 border rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer text-center ${
                                filterMode === 'year-month'
                                    ? 'border-emerald-500/70 text-emerald-400'
                                    : 'border-slate-700 text-slate-200'
                            }`}
                        >
                            {availableYears.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>

                    {/* Month Dropdown */}
                    <div className="relative">
                        <select
                            value={selectedMonth}
                            onChange={(e) => handleMonthChange(e.target.value)}
                            className={`bg-slate-900 border rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer text-center ${
                                filterMode === 'year-month' && selectedMonth !== 'all'
                                    ? 'border-emerald-500/70 text-emerald-400'
                                    : 'border-slate-700 text-slate-200'
                            }`}
                        >
                            <option value="all">كل السنة (12 شهر)</option>
                            {ARABIC_MONTHS.map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* 3. Specific Date + Date Range Filter (dd-mm-yyyy) */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-t border-slate-700/50 pt-4">
                {/* Specific Day */}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1 ml-1">
                        <span><icons.calendar size={13} className="inline" /></span> تحديد يوم محدد:
                    </span>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => handleDateChange(e.target.value)}
                        className={`bg-slate-900 border rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer text-center [color-scheme:dark] ${
                            filterMode === 'date'
                                ? 'border-emerald-500/70 text-emerald-400'
                                : 'border-slate-700 text-slate-200'
                        }`}
                        title="dd-mm-yyyy"
                    />
                    {selectedDate && (
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 font-mono">
                            {formatToDDMMYYYY(selectedDate)}
                        </span>
                    )}
                </div>

                {/* Date Range */}
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1 ml-1">
                        <span><icons.calendarRange size={13} className="inline" /></span> فترة زمنية:
                    </span>
                    <span className="text-xs text-slate-500">من</span>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => handleDateFromChange(e.target.value)}
                        className={`bg-slate-900 border rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer text-center [color-scheme:dark] ${
                            filterMode === 'range'
                                ? 'border-emerald-500/70 text-emerald-400'
                                : 'border-slate-700 text-slate-200'
                        }`}
                        title="dd-mm-yyyy"
                    />
                    <span className="text-xs text-slate-500">إلى</span>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => handleDateToChange(e.target.value)}
                        className={`bg-slate-900 border rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer text-center [color-scheme:dark] ${
                            filterMode === 'range'
                                ? 'border-emerald-500/70 text-emerald-400'
                                : 'border-slate-700 text-slate-200'
                        }`}
                        title="dd-mm-yyyy"
                    />
                </div>
            </div>

            {/* 4. Summary Strip */}
            <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-300 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>النطاق النشط:</span>
                    <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {getPeriodDescription()}
                    </span>
                </div>

                <div className="flex items-center gap-4 text-slate-200">
                    <div>
                        <span className="text-slate-400">عدد الفواتير: </span>
                        <span className="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                            {filteredOrders.length}
                        </span>
                    </div>
                    <div>
                        <span className="text-slate-400">إجمالي المبيعات: </span>
                        <span className="font-mono font-black text-emerald-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-sm">
                            {filteredTotalRevenue.toFixed(2)} <span className="text-xs text-slate-400 font-normal">جنية</span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Pure helper module — reused by PeriodFilter component and the admin dashboard.
function toLocalDateStr(d) {
    if (!(d instanceof Date) || isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function filterOrdersByPeriod(orders, filterMode, selectedYear, selectedMonth, selectedDate, dateFrom, dateTo) {
    if (!orders || !Array.isArray(orders)) return [];
    const now = new Date();

    return orders.filter(order => {
        if (!order || !order.timestamp) return false;
        const d = new Date(order.timestamp);
        if (isNaN(d.getTime())) return false;

        if (filterMode === 'today') {
            return (
                d.getFullYear() === now.getFullYear() &&
                d.getMonth() === now.getMonth() &&
                d.getDate() === now.getDate()
            );
        }

        if (filterMode === 'week') {
            // Start of week (Sunday 00:00:00)
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
            const dayStr = toLocalDateStr(d);
            return Boolean(dayStr && selectedDate && dayStr === selectedDate);
        }

        if (filterMode === 'range') {
            const dayStr = toLocalDateStr(d);
            if (!dayStr) return false;
            if (dateFrom && dayStr < dateFrom) return false;
            if (dateTo && dayStr > dateTo) return false;
            return true;
        }

        // 'all' or default
        return true;
    });
}
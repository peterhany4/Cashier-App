import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PeriodFilter from './PeriodFilter';
import { filterOrdersByPeriod } from './periodFilterUtils';

const order = (y, m, d, total = 10) =>
    ({ id: `${y}-${m}-${d}`, timestamp: new Date(y, m, d, 12, 0, 0).toISOString(), total });

describe('filterOrdersByPeriod (pure)', () => {
    const june15 = order(2026, 5, 15, 50);
    const june01 = order(2026, 5, 1, 10);
    const lastYear = order(2025, 5, 15, 20);

    it('returns all for "all"', () => {
        const out = filterOrdersByPeriod([june15, lastYear], 'all', 2026, 0, '', '', '');
        expect(out).toHaveLength(2);
    });

    it('handles non-array / bad data', () => {
        expect(filterOrdersByPeriod(null, 'all', 2026, 0, '', '', '')).toEqual([]);
        expect(filterOrdersByPeriod([{ id: 1, timestamp: 'not-a-date' }], 'all', 2026, 0, '', '', '')).toEqual([]);
    });

    it('filters by year + month (June 2026)', () => {
        const out = filterOrdersByPeriod([june15, june01, lastYear], 'year-month', 2026, 5, '', '', '');
        expect(out.map(o => o.id)).toEqual([june15.id, june01.id]);
    });

    it('filters a single exact date (2026-06-15)', () => {
        const out = filterOrdersByPeriod([june15, june01, lastYear], 'date', 2026, 0, '2026-06-15', '', '');
        expect(out.map(o => o.id)).toEqual([june15.id]);
    });

    it('filters an inclusive date range', () => {
        const out = filterOrdersByPeriod([june15, june01, lastYear], 'range', 2026, 0, '', '2026-06-01', '2026-06-30');
        expect(out.map(o => o.id)).toEqual([june15.id, june01.id]);
    });

    it('matches a "today" order only', () => {
        const nowOrder = { id: 'now', timestamp: new Date().toISOString(), total: 9 };
        const out = filterOrdersByPeriod([nowOrder, lastYear], 'today', 2026, 0, '', '', '');
        expect(out.map(o => o.id)).toEqual(['now']);
    });
});

describe('PeriodFilter component', () => {
    const orders = [
        order(2026, 5, 15, 50),
        order(2025, 11, 1, 20),
        { id: 'now', timestamp: new Date().toISOString(), total: 9 },
    ];

    it('renders the quick-action buttons and date inputs', () => {
        render(<PeriodFilter orders={orders} />);
        expect(screen.getByRole('button', { name: /اليوم/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /كل الأوقات/ })).toBeInTheDocument();
        expect(screen.getByPlaceholderText ? screen.getAllByText('تحديد يوم محدد:').length : 0).toBe(1);
    });

    it('switching to "all times" changes the active-range description', () => {
        render(<PeriodFilter orders={orders} />);
        fireEvent.click(screen.getByRole('button', { name: /كل الأوقات/ }));
        expect(screen.getByText('جميع الفواتير (كل الأوقات)')).toBeInTheDocument();
    });

    it('switching to "today" changes the active-range description', () => {
        render(<PeriodFilter orders={orders} />);
        fireEvent.click(screen.getByRole('button', { name: /اليوم/ }));
        expect(screen.getByText('مبيعات اليوم')).toBeInTheDocument();
    });
});
import { cx } from './utils';

// Reusable table styling so every screen renders tables identically.
export const tableWrap = 'overflow-x-auto';
export const tableClass = 'w-full text-right border-collapse';
export const theadClass = 'bg-surface-3/50 text-slate-300 border-b border-surface-3 text-sm';
export const thClass = 'p-3.5 font-bold';
export const tbodyClass = 'divide-y divide-surface-3/40 text-sm';
export const rowClass = 'hover:bg-surface-4/20 transition-colors';
export const tdClass = 'p-3.5';

export default function Table({ className = '', children, ...rest }) {
    return (
        <div className={tableWrap}>
            <table className={cx(tableClass, className)} {...rest}>
                {children}
            </table>
        </div>
    );
}
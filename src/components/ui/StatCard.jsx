import { cx } from './utils';

const ACCENTS = {
    neutral: { iconBg: 'bg-surface-3/60 text-slate-300', value: 'text-white' },
    brand: { iconBg: 'bg-brand-500/10 text-brand-400', value: 'text-brand-400' },
    warning: { iconBg: 'bg-warning-500/10 text-warning-500', value: 'text-warning-500' },
    danger: { iconBg: 'bg-danger-500/10 text-danger-400', value: 'text-danger-400' },
    info: { iconBg: 'bg-info-500/10 text-info-400', value: 'text-info-400' },
};

export default function StatCard({
    label,
    value,
    suffix,
    icon: Icon = null,
    accent = 'neutral',
    sub,
    className = '',
}) {
    const tone = ACCENTS[accent] || ACCENTS.neutral;
    return (
        <div className={cx('bg-surface-1 border border-surface-3/60 rounded-2xl p-5 flex items-center justify-between gap-4', className)}>
            <div className="min-w-0">
                <span className="text-xs text-slate-400 font-bold block mb-1">{label}</span>
                <span className={cx('text-3xl font-extrabold tabular-nums leading-tight', tone.value)}>
                    {value}
                </span>
                {suffix && <span className="text-xs text-slate-400 font-normal mr-1">{suffix}</span>}
                {sub && <p className="text-[11px] text-slate-500 mt-1">{sub}</p>}
            </div>
            {Icon && (
                <span className={cx('shrink-0 p-3 rounded-xl', tone.iconBg)}>
                    <Icon size={26} strokeWidth={2} />
                </span>
            )}
        </div>
    );
}
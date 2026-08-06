// Tiny class-name joiner used across the UI primitives.
export const cx = (...parts) => parts.filter(Boolean).join(' ');

// Shared field styling (used by Input / Select / TextArea).
export const fieldBase = (invalid) => cx(
    'w-full bg-surface-2 border text-sm text-white placeholder:text-slate-500',
    'focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-transparent',
    invalid ? 'border-danger-500/70' : 'border-surface-3/60',
);

export const fieldSize = 'px-3.5 py-2 rounded-lg';

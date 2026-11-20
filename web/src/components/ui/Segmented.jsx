import { motion } from 'motion/react';
import { useId } from 'react';

/** Nút chọn dạng viên trượt. options: [{ value, label, icon?, count? }] */
export default function Segmented({ options, value, onChange, size = 'md', label, className = '' }) {
  const id = useId();
  const pad = size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-9 px-3 text-[13px]';

  return (
    <div role="tablist" aria-label={label} className={`inline-flex rounded-xl bg-surface-2 p-1 ${className}`}>
      {options.map((opt) => {
        const active = opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`relative flex items-center justify-center gap-1.5 rounded-[9px] font-semibold whitespace-nowrap transition-colors duration-200 ${pad} ${
              active ? 'text-ink' : 'text-muted hover:text-ink'
            }`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-[9px] bg-surface shadow-[0_1px_0_0_var(--line-strong),0_4px_12px_-6px_rgb(0_0_0/0.5)]"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            {Icon && <Icon className="relative size-4" aria-hidden="true" />}
            <span className={`relative ${opt.hideLabelOnMobile ? 'max-sm:sr-only' : ''}`}>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={`relative min-w-5 rounded-md px-1 text-[11px] tabular-nums ${
                  active ? (opt.alert ? 'tone-danger' : 'tone-accent') : 'bg-surface-3 text-muted'
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

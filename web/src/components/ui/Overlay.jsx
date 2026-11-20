import { Lightbulb } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { tr } from '../../lib/i18n.js';

function useEscape(onClose, active = true) {
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, active]);
}

/** Hộp thoại ở giữa màn hình (hoặc sát đáy trên điện thoại). */
export function Dialog({ open, onClose, title, children, width = 'sm:max-w-md', labelId = 'dialog-title' }) {
  useEscape(onClose, open);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-2 sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelId}
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8, transition: { duration: 0.15 } }}
            transition={{ duration: 0.38, ease: [0.2, 0.75, 0.2, 1] }}
            className={`shadow-lift relative max-h-[calc(100dvh-1rem)] w-full overflow-y-auto rounded-[22px] border border-line bg-surface p-5 sm:p-6 ${width}`}
          >
            {title && (
              <h2 id={labelId} className="font-display text-base font-bold">
                {title}
              </h2>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, body, confirmLabel = tr('Xoá'), danger = true }) {
  return (
    <Dialog open={open} onClose={onClose} title={title} labelId="confirm-title">
      <p className="mt-2 text-muted">{body}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="h-10 rounded-xl px-4 font-semibold text-muted hover:bg-surface-2 hover:text-ink">
          {tr('Huỷ')}
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`h-10 rounded-xl px-4 font-semibold text-white ${danger ? 'bg-danger-solid hover:brightness-110' : 'bg-accent hover:brightness-110'}`}
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}

/** Menu thả xuống đơn giản. items: [{ label, icon, onClick, danger }] */
export function Menu({ trigger, items, align = 'right', label = tr('Mở menu') }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEscape(() => setOpen(false), open);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink"
      >
        {trigger}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.1 } }}
            transition={{ duration: 0.18 }}
            className={`shadow-lift absolute top-full z-40 mt-1 min-w-44 origin-top rounded-xl border border-line bg-surface p-1 ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
          >
            {items.filter(Boolean).map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                    item.onClick();
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium ${
                    item.danger ? 'text-danger hover:bg-danger/10' : 'text-ink hover:bg-surface-2'
                  }`}
                >
                  {Icon && <Icon className="size-4" aria-hidden="true" />}
                  {item.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const EMPTY_WAVE = `M0 10 Q12 4 24 10 ${Array.from({ length: 7 }, (_, i) => `T ${48 + i * 24} 10`).join(' ')} V 40 H 0 Z`;

/** Minh hoạ cho màn hình trống: một "bể nước" nhỏ có sóng và bọt khí, biểu tượng nổi ở giữa. */
function EmptyArt({ icon: Icon, size = 96 }) {
  return (
    <div className="relative" style={{ width: size, height: size }} aria-hidden="true">
      <div className="absolute inset-0 overflow-hidden rounded-full border border-line bg-surface-2">
        <svg className="absolute bottom-[18%] h-[30%] w-[200%]" viewBox="0 0 192 40" preserveAspectRatio="none">
          <path className="wave-drift-slow" d={EMPTY_WAVE} fill="var(--accent)" opacity="0.14" />
        </svg>
        <svg className="absolute bottom-0 h-[34%] w-[200%]" viewBox="0 0 192 40" preserveAspectRatio="none">
          <path className="wave-drift" d={EMPTY_WAVE} fill="var(--accent)" opacity="0.24" />
        </svg>
        <span className="bubble absolute bottom-1 left-[30%] size-1.5 rounded-full bg-accent/50" style={{ '--dur': '4.5s' }} />
        <span className="bubble absolute bottom-1 left-[62%] size-1 rounded-full bg-accent/50" style={{ '--dur': '5.5s', '--delay': '1.6s' }} />
      </div>
      {Icon && (
        <span className="absolute inset-0 grid place-items-center">
          <span className="tone-accent grid size-11 place-items-center rounded-2xl bg-surface shadow-[0_10px_24px_-12px_var(--accent)] ring-1 ring-accent/25">
            <Icon className="size-5" />
          </span>
        </span>
      )}
      <span className="absolute -top-0.5 right-2 size-2 rounded-full bg-accent/40" />
      <span className="absolute top-4 -left-1 size-1.5 rounded-full bg-accent/25" />
    </div>
  );
}

/** Màn hình trống: minh hoạ, tiêu đề, giải thích, nút hành động và một mẹo nhỏ. */
export function EmptyState({ icon, title, body, action, hint, compact = false }) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? 'px-4 py-6' : 'px-6 py-10'}`}>
      <EmptyArt icon={icon} size={compact ? 76 : 96} />
      <p className={`font-display font-bold ${compact ? 'mt-3 text-[14px]' : 'mt-4 text-[15px]'}`}>{title}</p>
      {body && <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted">{body}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
      {hint && (
        <p className="mt-4 flex items-start gap-1.5 text-left text-xs text-faint">
          <Lightbulb className="mt-px size-3.5 shrink-0 text-warning" aria-hidden="true" />
          <span>{hint}</span>
        </p>
      )}
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-surface-3 ${className}`} />;
}

/** Khung chờ trong lúc tải code của một trang. */
export function PageFallback() {
  return (
    <div className="space-y-3.5" role="status" aria-label={tr('Đang tải trang')}>
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-3.5 lg:grid-cols-3">
        <Skeleton className="h-44 rounded-[20px] lg:col-span-2" />
        <Skeleton className="h-44 rounded-[20px]" />
      </div>
      <Skeleton className="h-64 rounded-[20px]" />
    </div>
  );
}

import { CheckCircle2, CircleAlert, LoaderCircle, X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HUES, thumb } from '../lib/format.js';

/* ---------- Nút ---------- */
const VARIANTS = {
  primary: 'bg-accent text-white hover:brightness-110 shadow-[0_8px_20px_-10px_var(--accent)]',
  secondary: 'bg-surface-2 text-ink ring-1 ring-line hover:bg-surface-3',
  ghost: 'text-muted hover:bg-surface-3 hover:text-ink',
  danger: 'bg-danger-solid text-white hover:brightness-110',
};
export function Button({ variant = 'secondary', size = 'md', loading = false, className = '', children, ...props }) {
  const sizes = { sm: 'h-8 px-3 text-[13px] gap-1.5', md: 'h-10 px-4 text-sm gap-2', icon: 'size-9 justify-center' };
  return (
    <button
      type="button"
      className={`inline-flex shrink-0 items-center rounded-xl font-semibold transition disabled:opacity-50 ${sizes[size]} ${VARIANTS[variant]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function Card({ className = '', children, ...props }) {
  return (
    <section className={`rounded-2xl border border-line bg-surface ${className}`} {...props}>
      {children}
    </section>
  );
}

export function Badge({ tone = 'muted', className = '', children, ...props }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap tone-${tone} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

export function Spinner({ label = 'Đang tải', className = '' }) {
  return (
    <div className={`grid place-items-center py-16 text-muted ${className}`} role="status">
      <LoaderCircle className="size-6 animate-spin" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function Empty({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {Icon && (
        <span className="grid size-12 place-items-center rounded-2xl bg-surface-2 text-muted ring-1 ring-line">
          <Icon className="size-6" aria-hidden="true" />
        </span>
      )}
      <p className="mt-4 font-semibold">{title}</p>
      {children && <div className="mt-1.5 max-w-md text-[13px] text-muted">{children}</div>}
    </div>
  );
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-[13px]">
      <CircleAlert className="size-5 shrink-0 text-danger" aria-hidden="true" />
      <p className="min-w-0 flex-1">{error?.message || 'Có lỗi xảy ra'}</p>
      {onRetry && (
        <Button size="sm" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  );
}

/* ---------- Ảnh đại diện (giống web: chữ cái cuối của tên, emoji hoặc ảnh) ---------- */
export function Avatar({ user, size = 36 }) {
  const style = { width: size, height: size };
  const avatar = user?.avatar || '';
  if (avatar.startsWith('data:image/') || avatar.startsWith('https://res.cloudinary.com/')) {
    return (
      <img
        src={avatar.startsWith('https://') ? thumb(avatar, size * 2, size * 2) : avatar}
        alt=""
        className="shrink-0 rounded-full object-cover"
        style={style}
      />
    );
  }
  const hue = HUES[user?.avatarColor] || HUES.blue;
  const emoji = avatar.startsWith('emoji:') ? avatar.slice(6) : '';
  const letter = (user?.name || '?').trim().split(/\s+/).pop().charAt(0).toUpperCase();
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-bold text-white"
      style={{
        ...style,
        background: emoji ? 'var(--surface-3)' : `linear-gradient(135deg, ${hue}, color-mix(in oklab, ${hue} 60%, black))`,
        fontSize: size * (emoji ? 0.55 : 0.42),
      }}
      aria-hidden="true"
    >
      {emoji || letter}
    </span>
  );
}

/* ---------- Chọn một trong nhiều (dạng tab) ---------- */
export function Segmented({ value, onChange, options, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-xl bg-surface-2 p-1 ring-1 ring-line">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition ${
            value === o.value ? 'bg-surface text-ink shadow-sm ring-1 ring-line' : 'text-muted hover:text-ink'
          }`}
        >
          {o.label}
          {o.count !== undefined && <span className="rounded-full bg-surface-3 px-1.5 text-[11px] text-muted">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------- Hộp thoại ---------- */
export function Dialog({ open, onClose, title, description, children, width = 'max-w-md', labelledBy }) {
  const ref = useRef(null);
  const autoId = useId();
  const titleId = labelledBy || `${autoId}-title`;
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const node = ref.current;
    const focusables = () =>
      [...node.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((el) => !el.disabled);
    (node.querySelector('[data-autofocus]') || focusables()[0] || node).focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
      if (e.key === 'Tab') {
        const list = focusables();
        if (!list.length) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    node.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      node.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`rise relative max-h-[calc(100dvh-24px)] w-full overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-lift sm:p-6 ${width}`}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="font-display text-[17px] font-bold">
              {title}
            </h2>
            {description && <p className="mt-1.5 text-[13px] text-muted">{description}</p>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Đóng" className="-mt-1 -mr-2">
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/** Hộp xác nhận. confirmText: bắt gõ đúng chữ này mới bấm được (vd. email khi xoá tài khoản). */
export function ConfirmDialog({ open, onClose, onConfirm, title, description, children, confirmLabel = 'Xác nhận', danger = false, confirmText, loading }) {
  const [typed, setTyped] = useState('');
  const inputId = useId();
  useEffect(() => {
    if (open) setTyped('');
  }, [open]);
  const blocked = confirmText && typed.trim().toLowerCase() !== confirmText.toLowerCase();
  return (
    <Dialog open={open} onClose={onClose} title={title} description={description}>
      {children}
      {confirmText && (
        <div className="mt-3">
          <label htmlFor={inputId} className="text-[13px] text-muted">
            Gõ <b className="text-ink">{confirmText}</b> để xác nhận
          </label>
          <input
            id={inputId}
            data-autofocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            className="mt-1.5 h-10 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm outline-none focus:border-accent"
          />
        </div>
      )}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button onClick={onClose}>Huỷ</Button>
        <Button
          variant={danger ? 'danger' : 'primary'}
          onClick={onConfirm}
          loading={loading}
          disabled={blocked}
          data-autofocus={confirmText ? undefined : true}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}

/* ---------- Thông báo nhỏ góc màn hình ---------- */
const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, tone = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setItems((list) => [...list.slice(-3), { id, message, tone }]);
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 4200);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-3 bottom-3 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:items-end"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className="rise pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-xl border border-line bg-surface px-4 py-3 text-[13px] shadow-lift"
          >
            {t.tone === 'error' ? (
              <CircleAlert className="mt-px size-4 shrink-0 text-danger" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="mt-px size-4 shrink-0 text-success" aria-hidden="true" />
            )}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function PageHeader({ title, description, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-[22px] font-bold tracking-tight sm:text-[26px]">{title}</h1>
        {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder, label }) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={label || placeholder}
      className="h-10 w-full min-w-0 rounded-xl border border-line bg-surface px-3.5 text-sm outline-none placeholder:text-faint focus:border-accent sm:w-72"
    />
  );
}

/** Giá trị gõ vào ô tìm kiếm, chỉ cập nhật sau khi ngừng gõ một chút. */
export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

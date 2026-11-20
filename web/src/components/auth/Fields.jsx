import { Check, Eye, EyeOff } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { forwardRef, useId, useState } from 'react';
import { hueOf } from '../../lib/constants.js';

const inputBase =
  'h-11 w-full rounded-xl border bg-surface-2/60 px-3.5 text-[14px] text-ink outline-none transition-[border-color,box-shadow] placeholder:text-faint disabled:cursor-not-allowed disabled:opacity-60';

function FieldShell({ id, label, error, hint, children, aside }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-semibold">
          {label}
        </label>
        {aside}
      </div>
      {children}
      <AnimatePresence initial={false} mode="wait">
        {error ? (
          <motion.p
            key="err"
            id={`${id}-error`}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-1.5 text-xs font-medium text-danger"
            role="alert"
          >
            {error}
          </motion.p>
        ) : (
          hint && (
            <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1.5 text-xs text-faint">
              {hint}
            </motion.p>
          )
        )}
      </AnimatePresence>
    </div>
  );
}

const ring = (error) => (error ? 'border-danger/70 focus:ring-4 focus:ring-danger/15' : 'border-line focus:border-accent/70 focus:ring-4 focus:ring-accent/15');

export const TextField = forwardRef(function TextField({ label, error, hint, aside, className = '', ...props }, ref) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} aside={aside}>
      <input
        ref={ref}
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${inputBase} ${ring(error)} ${className}`}
        {...props}
      />
    </FieldShell>
  );
});

export const PasswordField = forwardRef(function PasswordField({ label = 'Mật khẩu', error, hint, aside, children, ...props }, ref) {
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} aside={aside}>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={show ? 'text' : 'password'}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`${inputBase} ${ring(error)} pr-11`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-faint hover:bg-surface-3 hover:text-ink"
          aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          aria-pressed={show}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {children}
    </FieldShell>
  );
});

/** Chấm điểm mật khẩu 0..4 (chỉ để gợi ý, server mới là nơi kiểm tra thật). */
export function scorePassword(pw = '') {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[a-zà-ỹ]/.test(pw) && /[A-ZÀ-Ỹ]/.test(pw)) score += 1;
  if (/\d/.test(pw) && /[^\p{L}\d]/u.test(pw)) score += 1;
  return Math.min(score, 4);
}

const LEVELS = [
  { label: 'Quá ngắn', color: 'var(--danger)' },
  { label: 'Yếu', color: 'var(--danger)' },
  { label: 'Tạm được', color: 'var(--warning)' },
  { label: 'Khá', color: 'var(--accent-hi)' },
  { label: 'Mạnh', color: 'var(--success)' },
];

/** Thanh độ mạnh dạng "ống nước" + 3 điều kiện bắt buộc. */
export function PasswordStrength({ password }) {
  const score = scorePassword(password);
  const level = LEVELS[score];
  const rules = [
    { ok: password.length >= 8, text: 'Ít nhất 8 ký tự' },
    { ok: /\p{L}/u.test(password), text: 'Có chữ cái' },
    { ok: /\d/.test(password), text: 'Có chữ số' },
  ];
  return (
    <div className="mt-2.5" aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            animate={{ width: `${password ? Math.max(score, 0.5) * 25 : 0}%`, backgroundColor: level.color }}
            transition={{ type: 'spring', stiffness: 200, damping: 24 }}
          />
        </div>
        <span className="w-16 text-right text-[11px] font-semibold" style={{ color: password ? level.color : 'var(--faint)' }}>
          {password ? level.label : 'Độ mạnh'}
        </span>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {rules.map((r) => (
          <li key={r.text} className={`flex items-center gap-1.5 text-xs transition-colors ${r.ok ? 'text-success' : 'text-faint'}`}>
            <span className={`grid size-3.5 place-items-center rounded-full transition-colors ${r.ok ? 'bg-success/20' : 'border border-line-strong'}`}>
              {r.ok && <Check className="size-2.5" strokeWidth={3} aria-hidden="true" />}
            </span>
            {r.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Ô tròn chữ cái đầu tên, tô theo màu người dùng chọn. */
export function Avatar({ user, size = 36, className = '' }) {
  const letter = (user?.name || '?').trim().split(/\s+/).pop().charAt(0).toUpperCase();
  return (
    <span
      className={`hue-ring grid shrink-0 place-items-center rounded-full font-display font-bold text-white ${className}`}
      style={{
        '--hue': hueOf(user?.avatarColor),
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: 'linear-gradient(145deg, color-mix(in oklab, var(--hue) 90%, white), color-mix(in oklab, var(--hue) 70%, black))',
      }}
      aria-hidden="true"
    >
      {letter}
    </span>
  );
}

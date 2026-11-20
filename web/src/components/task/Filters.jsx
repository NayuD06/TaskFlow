import { ArrowDownWideNarrow, Check, SlidersHorizontal, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { PRIORITIES, PRIORITY } from '../../lib/constants.js';
import { dueBucket } from '../../lib/dates.js';
import { TagChip } from '../ui/Pills.jsx';
import { tr } from '../../lib/i18n.js';

export const EMPTY_FILTERS = { priorities: [], tags: [], due: '' };

export const filterCount = (f) => f.priorities.length + f.tags.length + (f.due ? 1 : 0);

const DUE_OPTIONS = [
  { value: '', label: tr('Mọi hạn') },
  { value: 'overdue', label: tr('Trễ hạn') },
  { value: 'today', label: tr('Hôm nay') },
  { value: 'week', label: tr('Trong 7 ngày') },
  { value: 'none', label: tr('Chưa có hạn') },
];

export const SORTS = [
  { value: 'board', label: tr('Thứ tự trên bảng') },
  { value: 'deadline', label: tr('Hạn gần nhất') },
  { value: 'priority', label: tr('Ưu tiên cao trước') },
  { value: 'newest', label: tr('Mới thêm') },
  { value: 'updated', label: tr('Mới sửa') },
  { value: 'title', label: tr('Tên A → Z') },
];

const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0) || new Date(b.createdAt) - new Date(a.createdAt);
const byDeadline = (a, b) => (a.deadline ? new Date(a.deadline) : Infinity) - (b.deadline ? new Date(b.deadline) : Infinity);
const COMPARE = {
  board: byOrder,
  deadline: (a, b) => byDeadline(a, b) || byOrder(a, b),
  priority: (a, b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority) || byDeadline(a, b),
  newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  updated: (a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt),
  title: (a, b) => a.title.localeCompare(b.title, 'vi', { sensitivity: 'base' }),
};

export const sortTasks = (list, sort = 'board') => [...list].sort(COMPARE[sort] || byOrder);

/** Lọc theo ưu tiên (nhiều mức), nhãn (khớp một trong các nhãn) và nhóm hạn chót. */
export function applyFilters(tasks, f, now = new Date()) {
  const tags = f.tags.map((t) => t.toLowerCase());
  return tasks.filter((t) => {
    if (f.priorities.length && !f.priorities.includes(t.priority)) return false;
    if (tags.length && !(t.tags || []).some((x) => tags.includes(x.toLowerCase()))) return false;
    if (f.due) {
      const bucket = dueBucket(t, now);
      if (f.due === 'none') return bucket === 'none';
      if (t.status === 'done') return false;
      if (f.due === 'week') return bucket === 'today' || bucket === 'week';
      return bucket === f.due;
    }
    return true;
  });
}

/** Đếm số việc cho từng nhãn trong danh sách đang xem. */
export function tagsOf(tasks) {
  const map = new Map();
  for (const t of tasks)
    for (const tag of t.tags || []) {
      const key = tag.toLowerCase();
      const cur = map.get(key);
      map.set(key, { name: cur?.name || tag, count: (cur?.count || 0) + 1 });
    }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'vi'));
}

const toggleIn = (list, item) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors ${
        active ? 'border-accent/50 bg-accent-soft text-ink' : 'border-line text-muted hover:border-line-strong hover:text-ink'
      }`}
    >
      {active && <Check className="size-3.5 text-accent-hi" aria-hidden="true" />}
      {children}
    </button>
  );
}

/** Nút "Bộ lọc" mở bảng chọn nhỏ. */
export function FilterButton({ value, onChange, tags = [], showDue = true, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const panelId = useId();
  const count = filterCount(value);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        ref.current?.querySelector('button')?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className={`inline-flex h-11 items-center gap-2 rounded-xl border px-3.5 text-[13px] font-semibold transition-colors ${
          count ? 'border-accent/50 bg-accent-soft text-ink' : 'border-line bg-surface text-muted hover:text-ink'
        }`}
      >
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        {tr('Bộ lọc')}
        {count > 0 && <span className="grid min-w-5 place-items-center rounded-md bg-accent px-1 text-[11px] text-white tabular-nums">{count}</span>}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            role="dialog"
            aria-label={tr('Bộ lọc công việc')}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
            transition={{ duration: 0.18 }}
            className={`shadow-lift absolute top-full z-40 mt-2 w-[min(320px,calc(100vw-32px))] origin-top rounded-2xl border border-line bg-surface p-4 ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
          >
            <fieldset>
              <legend className="mb-2 text-xs font-semibold text-muted">{tr('Ưu tiên')}</legend>
              <div className="flex flex-wrap gap-1.5">
                {PRIORITIES.map((p) => (
                  <Chip key={p} active={value.priorities.includes(p)} onClick={() => onChange({ ...value, priorities: toggleIn(value.priorities, p) })}>
                    <span className="size-2 rounded-full" style={{ background: PRIORITY[p].color }} aria-hidden="true" />
                    {PRIORITY[p].label}
                  </Chip>
                ))}
              </div>
            </fieldset>

            {showDue && (
              <fieldset className="mt-4">
                <legend className="mb-2 text-xs font-semibold text-muted">{tr('Hạn chót')}</legend>
                <div className="flex flex-wrap gap-1.5">
                  {DUE_OPTIONS.map((o) => (
                    <Chip key={o.value} active={value.due === o.value} onClick={() => onChange({ ...value, due: o.value })}>
                      {o.label}
                    </Chip>
                  ))}
                </div>
              </fieldset>
            )}

            <fieldset className="mt-4">
              <legend className="mb-2 text-xs font-semibold text-muted">{tr('Nhãn')}</legend>
              {tags.length ? (
                <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
                  {tags.map((t) => {
                    const active = value.tags.some((x) => x.toLowerCase() === t.name.toLowerCase());
                    return (
                      <Chip
                        key={t.name}
                        active={active}
                        onClick={() =>
                          onChange({
                            ...value,
                            tags: active ? value.tags.filter((x) => x.toLowerCase() !== t.name.toLowerCase()) : [...value.tags, t.name],
                          })
                        }
                      >
                        #{t.name}
                        <span className="text-[11px] font-medium text-faint tabular-nums">{t.count}</span>
                      </Chip>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-faint">{tr('Chưa có nhãn nào. Mở một công việc để gắn nhãn.')}</p>
              )}
            </fieldset>

            <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
              <button
                type="button"
                onClick={() => onChange(EMPTY_FILTERS)}
                disabled={!count}
                className="text-xs font-semibold text-muted hover:text-ink disabled:opacity-40"
              >
                {tr('Bỏ lọc')}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-8 rounded-lg bg-accent px-3 text-xs font-semibold text-white hover:brightness-110"
              >
                {tr('Xong')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Các bộ lọc đang bật, bấm dấu x để bỏ từng cái. */
export function ActiveFilters({ value, onChange, shown, total, extra = [], onClearAll }) {
  const items = useMemo(
    () => [
      ...extra,
      ...value.priorities.map((p) => ({
        key: `p-${p}`,
        label: PRIORITY[p].label,
        onRemove: () => onChange({ ...value, priorities: value.priorities.filter((x) => x !== p) }),
      })),
      ...(value.due ? [{ key: 'due', label: DUE_OPTIONS.find((o) => o.value === value.due)?.label, onRemove: () => onChange({ ...value, due: '' }) }] : []),
      ...value.tags.map((tag) => ({ key: `t-${tag}`, tag, onRemove: () => onChange({ ...value, tags: value.tags.filter((x) => x !== tag) }) })),
    ],
    [value, onChange, extra],
  );

  return (
    <AnimatePresence>
      {items.length > 0 && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
            <span className="mr-1">{tr('Đang hiện {shown}/{total} việc', { shown, total })}</span>
            {items.map((it) => (
              <span key={it.key} className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface py-0.5 pr-1 pl-2 font-medium text-ink">
                {it.tag ? <TagChip name={it.tag} /> : it.label}
                <button
                  type="button"
                  onClick={it.onRemove}
                  className="grid size-5 place-items-center rounded-md text-faint hover:bg-surface-2 hover:text-ink"
                  aria-label={tr('Bỏ lọc {name}', { name: it.tag ? `#${it.tag}` : it.label })}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            <button type="button" onClick={onClearAll} className="ml-1 font-semibold text-accent-hi hover:underline">
              {tr('Bỏ lọc')}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SortSelect({ value, onChange }) {
  return (
    <label className="relative">
      <span className="sr-only">{tr('Sắp xếp')}</span>
      <ArrowDownWideNarrow className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" aria-hidden="true" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-xl border border-line bg-surface pr-3 pl-9 text-[13px] outline-none focus:border-accent/60"
      >
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}

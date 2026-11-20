import { Plus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { ProgressBar } from '../ui/Charts.jsx';
import LiquidCheck from '../ui/LiquidCheck.jsx';

/** Checklist con trong task. items: [{ _id?, text, done }], onChange(newItems) */
export default function Checklist({ items = [], onChange }) {
  const [draft, setDraft] = useState('');
  const [hideDone, setHideDone] = useState(false);
  const done = items.filter((i) => i.done).length;
  const progress = items.length ? Math.round((done / items.length) * 100) : 0;
  const visible = hideDone ? items.filter((i) => !i.done) : items;

  const add = () => {
    const lines = draft
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) return;
    onChange([...items, ...lines.map((text) => ({ text, done: false }))]);
    setDraft('');
  };

  const update = (index, patch) => onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  const remove = (index) => onChange(items.filter((_, i) => i !== index));

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-semibold">
          Checklist{' '}
          {items.length > 0 && (
            <span className="font-normal text-muted">
              {done} / {items.length}
            </span>
          )}
        </p>
        {done > 0 && (
          <button type="button" onClick={() => setHideDone((v) => !v)} className="text-xs font-medium text-muted hover:text-ink">
            {hideDone ? 'Hiện mục đã xong' : 'Ẩn mục đã xong'}
          </button>
        )}
      </div>
      {items.length > 0 && <ProgressBar value={progress} color={progress === 100 ? 'var(--success)' : 'var(--accent)'} className="mt-2 h-1" />}

      <ul className="mt-2">
        <AnimatePresence initial={false}>
          {visible.map((item) => {
            const index = items.indexOf(item);
            return (
              <motion.li
                key={item._id || `${index}-${item.text}`}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="group flex items-center gap-2.5 overflow-hidden rounded-lg py-1 pl-1 hover:bg-surface-2"
              >
                <LiquidCheck
                  size={18}
                  checked={item.done}
                  color="var(--success)"
                  onToggle={() => update(index, { done: !item.done })}
                  label={`${item.done ? 'Bỏ đánh dấu' : 'Đánh dấu'}: ${item.text}`}
                />
                <input
                  defaultValue={item.text}
                  onBlur={(e) => {
                    const text = e.target.value.trim();
                    if (!text) remove(index);
                    else if (text !== item.text) update(index, { text });
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                  aria-label="Nội dung mục"
                  className={`min-w-0 flex-1 bg-transparent py-1 text-[13px] outline-none ${item.done ? 'text-muted line-through' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="grid size-7 place-items-center rounded-md text-faint opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:text-danger max-sm:opacity-100"
                  aria-label={`Xoá mục: ${item.text}`}
                >
                  <X className="size-3.5" />
                </button>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      <div className="mt-1 flex items-center gap-2 rounded-lg border border-dashed border-line-strong px-2.5 focus-within:border-accent">
        <Plus className="size-4 text-faint" aria-hidden="true" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text');
            if (text.includes('\n')) {
              e.preventDefault();
              const lines = text
                .split('\n')
                .map((l) => l.trim())
                .filter(Boolean);
              onChange([...items, ...lines.map((t) => ({ text: t, done: false }))]);
            }
          }}
          placeholder="Thêm mục (dán nhiều dòng để thêm nhiều mục)"
          className="h-9 flex-1 bg-transparent text-[13px] outline-none placeholder:text-faint"
        />
      </div>
    </div>
  );
}

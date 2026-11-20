import { CornerDownLeft, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useCreateTask } from '../../hooks/queries.js';
import { useToast } from '../ui/Toasts.jsx';

/** Ô thêm việc nhanh: Enter để tạo và giữ ô mở cho việc tiếp theo, Esc để đóng. */
export default function QuickAdd({ projectId, status = 'todo', open, onOpenChange, extra = {}, label = 'Thêm việc' }) {
  const [title, setTitle] = useState('');
  const inputRef = useRef(null);
  const create = useCreateTask();
  const notify = useToast();

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const submit = (e) => {
    e.preventDefault();
    const text = title.trim();
    if (!text) return;
    setTitle('');
    create.mutate({ title: text, project: projectId, status, ...extra }, { onError: (err) => notify({ tone: 'error', message: err.message }) });
  };

  return (
    <AnimatePresence initial={false} mode="wait">
      {open ? (
        <motion.form
          key="form"
          onSubmit={submit}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="relative rounded-xl border border-accent/50 bg-surface p-1 ring-4 ring-accent/10">
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && onOpenChange(false)}
              onBlur={() => !title.trim() && onOpenChange(false)}
              placeholder="Tên công việc..."
              maxLength={200}
              aria-label="Tên công việc mới"
              className="h-9 w-full bg-transparent pr-9 pl-2.5 text-[13px] outline-none placeholder:text-faint"
            />
            <button
              type="submit"
              aria-label="Thêm"
              className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-lg bg-accent text-white disabled:opacity-40"
              disabled={!title.trim()}
            >
              <CornerDownLeft className="size-3.5" />
            </button>
          </div>
          <p className="mt-1.5 px-1 text-[11px] text-faint">Enter để thêm, Esc để đóng</p>
        </motion.form>
      ) : (
        <motion.button
          key="btn"
          type="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => onOpenChange(true)}
          className="flex h-9 w-full items-center gap-2 rounded-xl px-2.5 text-[13px] font-medium text-muted hover:bg-surface-3 hover:text-ink"
        >
          <Plus className="size-4" aria-hidden="true" /> {label}
        </motion.button>
      )}
    </AnimatePresence>
  );
}

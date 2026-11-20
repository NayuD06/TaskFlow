import { Check, LoaderCircle, MoreHorizontal, RotateCcw, Trash2, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useCreateTask, useDeleteTask, useProjects, useTask, useUpdateTask } from '../../hooks/queries.js';
import { api } from '../../lib/api.js';
import { PRIORITIES, PRIORITY, STATUS, STATUSES, hueStyle } from '../../lib/constants.js';
import { formatTime, fromInputValue, quickDeadline, relativeTime, shortDate, toInputValue } from '../../lib/dates.js';
import { Menu } from '../ui/Overlay.jsx';
import Segmented from '../ui/Segmented.jsx';
import { useToast } from '../ui/Toasts.jsx';
import { useUI } from '../shell/UIContext.jsx';
import Checklist from './Checklist.jsx';

const QUICK = [
  { kind: 'today', label: 'Hôm nay' },
  { kind: 'tomorrow', label: 'Ngày mai' },
  { kind: 'nextWeek', label: 'Thứ Hai tới' },
];

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-[92px_1fr] items-start gap-3 py-2">
      <span className="pt-2 text-[13px] text-muted">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function AutoTextarea({ value, onChange, onBlur, className, ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return <textarea ref={ref} rows={1} value={value} onChange={onChange} onBlur={onBlur} className={className} {...rest} />;
}

function SheetBody({ task, mode, defaults, onClose }) {
  const notify = useToast();
  const qc = useQueryClient();
  const { data: projects = [] } = useProjects();
  const update = useUpdateTask();
  const create = useCreateTask();
  const remove = useDeleteTask();
  const creating = mode === 'create';

  const [form, setForm] = useState(() => ({
    title: task?.title ?? defaults?.title ?? '',
    description: task?.description ?? '',
    status: task?.status ?? defaults?.status ?? 'todo',
    priority: task?.priority ?? defaults?.priority ?? 'medium',
    deadline: task?.deadline ?? defaults?.deadline ?? null,
    project: task?.project?._id ?? defaults?.project ?? '',
    checklist: task?.checklist ?? [],
  }));
  const [error, setError] = useState(null);
  const [savedAt, setSavedAt] = useState(null);

  // Đồng bộ khi dữ liệu server đổi (vd đánh dấu xong ở chỗ khác)
  useEffect(() => {
    if (!task || creating) return;
    setForm((f) => ({ ...f, status: task.status, checklist: task.checklist ?? f.checklist, priority: task.priority, deadline: task.deadline }));
  }, [task?.status, task?.checklist, task?.priority, task?.deadline]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (creating && !form.project && projects.length) setForm((f) => ({ ...f, project: projects[0]._id }));
  }, [creating, projects, form.project]);

  const save = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    if (creating) return;
    update.mutate(
      { id: task._id, data: patch },
      {
        onSuccess: () => setSavedAt(Date.now()),
        onError: (err) => notify({ tone: 'error', message: err.message }),
      },
    );
  };

  const submit = async () => {
    if (!form.title.trim()) {
      setError('Hãy đặt tên cho công việc');
      return;
    }
    if (!form.project) {
      setError('Hãy chọn hoặc tạo một dự án trước');
      return;
    }
    setError(null);
    try {
      await create.mutateAsync({ ...form, title: form.title.trim(), description: form.description.trim() });
      notify({ tone: 'success', message: 'Đã thêm công việc' });
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = () => {
    const snapshot = task;
    onClose();
    remove.mutate(snapshot, {
      onSuccess: () =>
        notify({
          message: `Đã xoá “${snapshot.title}”`,
          action: {
            label: 'Hoàn tác',
            onClick: async () => {
              const { title, description, status, priority, deadline, checklist } = snapshot;
              try {
                await api.tasks.create({ title, description, status, priority, deadline, checklist, project: snapshot.project?._id });
              } catch (err) {
                notify({ tone: 'error', message: err.message });
              }
              qc.invalidateQueries();
            },
          },
        }),
      onError: (err) => notify({ tone: 'error', message: err.message }),
    });
  };

  const project = projects.find((p) => p._id === form.project) || task?.project;
  const done = form.status === 'done';

  return (
    <>
      <div className="flex items-center gap-2 border-b border-line px-5 py-3">
        <span className="flex min-w-0 flex-1 items-center gap-2 text-[13px] text-muted" style={hueStyle(project?.color)}>
          <span className="hue-dot size-2.5 shrink-0 rounded-full" />
          <span className="truncate">{creating ? 'Công việc mới' : project?.name}</span>
        </span>
        <AnimatePresence>
          {savedAt && !creating && (
            <motion.span
              key={savedAt}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1 text-xs text-success"
            >
              <Check className="size-3.5" /> Đã lưu
            </motion.span>
          )}
        </AnimatePresence>
        {!creating && (
          <Menu trigger={<MoreHorizontal className="size-4" />} items={[{ label: 'Xoá công việc', icon: Trash2, danger: true, onClick: handleDelete }]} />
        )}
        <button
          type="button"
          onClick={onClose}
          className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink"
          aria-label="Đóng"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6">
        <AutoTextarea
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value.replace(/\n/g, '') }))}
          onBlur={() => !creating && form.title.trim() && form.title.trim() !== task.title && save({ title: form.title.trim() })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (creating) submit();
              else e.currentTarget.blur();
            }
          }}
          autoFocus={creating}
          maxLength={120}
          placeholder="Tên công việc"
          aria-label="Tên công việc"
          className={`w-full resize-none bg-transparent font-display text-lg leading-snug font-bold outline-none placeholder:text-faint ${
            done ? 'text-muted line-through decoration-2' : ''
          }`}
        />

        <div className="mt-3 divide-y divide-line/60">
          <Row label="Trạng thái">
            <Segmented
              size="sm"
              label="Trạng thái"
              value={form.status}
              onChange={(status) => save({ status })}
              options={STATUSES.map((s) => ({ value: s, label: STATUS[s].label }))}
            />
          </Row>

          <Row label="Ưu tiên">
            <div className="flex flex-wrap gap-1.5">
              {PRIORITIES.map((p) => {
                const active = form.priority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => save({ priority: p })}
                    aria-pressed={active}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors ${
                      active ? PRIORITY[p].tone : 'text-muted hover:bg-surface-2 hover:text-ink'
                    }`}
                  >
                    <span className="size-2 rounded-full" style={{ background: PRIORITY[p].color }} />
                    {PRIORITY[p].label}
                  </button>
                );
              })}
            </div>
          </Row>

          <Row label="Hạn chót">
            <input
              type="datetime-local"
              value={toInputValue(form.deadline)}
              onChange={(e) => save({ deadline: fromInputValue(e.target.value) })}
              className="h-9 w-full max-w-60 rounded-lg border border-line bg-surface-2 px-2.5 text-[13px] outline-none focus:border-accent"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK.map((q) => (
                <button
                  key={q.kind}
                  type="button"
                  onClick={() => save({ deadline: quickDeadline(q.kind) })}
                  className="rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted hover:bg-accent-soft hover:text-accent-hi"
                >
                  {q.label}
                </button>
              ))}
              {form.deadline && (
                <button
                  type="button"
                  onClick={() => save({ deadline: null })}
                  className="rounded-lg px-2.5 py-1 text-xs font-medium text-faint hover:text-danger"
                >
                  Bỏ hạn
                </button>
              )}
            </div>
          </Row>

          <Row label="Dự án">
            <select
              value={form.project}
              onChange={(e) => save({ project: e.target.value })}
              className="h-9 w-full max-w-60 rounded-lg border border-line bg-surface-2 px-2.5 text-[13px] outline-none focus:border-accent"
            >
              {projects.length === 0 && <option value="">Chưa có dự án</option>}
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Row>
        </div>

        <div className="mt-4">
          <label htmlFor="sheet-desc" className="text-[13px] font-semibold">
            Mô tả
          </label>
          <AutoTextarea
            id="sheet-desc"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            onBlur={() => !creating && form.description !== (task.description || '') && save({ description: form.description })}
            maxLength={2000}
            placeholder="Thêm ghi chú, đường dẫn, ý tưởng…"
            className="mt-1.5 min-h-20 w-full resize-none rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-[13px] leading-relaxed outline-none placeholder:text-faint focus:border-accent"
          />
        </div>

        <div className="mt-5">
          <Checklist items={form.checklist} onChange={(checklist) => save({ checklist })} />
        </div>

        {error && (
          <motion.p
            role="alert"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: [-6, 6, -3, 0] }}
            className="tone-danger mt-4 rounded-xl px-3 py-2 text-[13px] font-medium"
          >
            {error}
          </motion.p>
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-line px-5 py-3">
        {creating ? (
          <>
            <span className="flex-1 text-xs text-faint">Enter để tạo nhanh</span>
            <button type="button" onClick={onClose} className="h-10 rounded-xl px-4 font-semibold text-muted hover:bg-surface-2 hover:text-ink">
              Huỷ
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={create.isPending}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 font-semibold text-white hover:brightness-110 disabled:opacity-60"
            >
              {create.isPending && <LoaderCircle className="size-4 animate-spin" />}
              Tạo công việc
            </button>
          </>
        ) : (
          <>
            <span className="flex-1 text-xs text-faint">
              Tạo {relativeTime(task.createdAt)}
              {task.completedAt && done && ` · xong lúc ${formatTime(task.completedAt)} ${shortDate(new Date(task.completedAt))}`}
            </span>
            <button
              type="button"
              onClick={() => save({ status: done ? 'todo' : 'done' })}
              className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 font-semibold ${
                done ? 'bg-surface-2 text-ink hover:bg-surface-3' : 'bg-success text-white hover:brightness-110'
              }`}
            >
              {done ? <RotateCcw className="size-4" /> : <Check className="size-4" />}
              {done ? 'Mở lại' : 'Đánh dấu xong'}
            </button>
          </>
        )}
      </div>
    </>
  );
}

export default function TaskSheet() {
  const { sheet, closeSheet } = useUI();
  const editingId = sheet?.mode === 'edit' ? sheet.id : null;
  const { data: task, isError } = useTask(editingId);

  useEffect(() => {
    if (!sheet) return undefined;
    const onKey = (e) => e.key === 'Escape' && closeSheet();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheet, closeSheet]);

  const ready = sheet && (sheet.mode === 'create' || task);

  return (
    <AnimatePresence>
      {sheet && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div className="absolute inset-0 bg-black/45" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeSheet} />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={sheet.mode === 'create' ? 'Tạo công việc' : 'Chi tiết công việc'}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.45, ease: [0.2, 0.75, 0.2, 1] }}
            className="shadow-lift relative flex h-full w-full max-w-[520px] flex-col border-l border-line bg-surface sm:my-2 sm:mr-2 sm:h-[calc(100%-16px)] sm:rounded-[22px] sm:border"
          >
            {ready ? (
              <SheetBody key={sheet.mode === 'create' ? 'new' : sheet.id} task={task} mode={sheet.mode} defaults={sheet.defaults} onClose={closeSheet} />
            ) : (
              <div className="grid flex-1 place-items-center text-muted">
                {isError ? 'Không tìm thấy công việc này.' : <LoaderCircle className="size-6 animate-spin" />}
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

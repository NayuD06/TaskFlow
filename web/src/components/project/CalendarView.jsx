import { locale } from '../../lib/i18n.js';
import { CalendarPlus, ChevronLeft, ChevronRight, Inbox, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { useUpdateTask } from '../../hooks/queries.js';
import { PRIORITY } from '../../lib/constants.js';
import { WEEKDAYS, formatMonth, isOverdue, isSameDay, monthGrid, startOfDay } from '../../lib/dates.js';
import { useUI } from '../shell/UIContext.jsx';
import TaskRow from '../task/TaskRow.jsx';
import { useToast } from '../ui/Toasts.jsx';
import { tr } from '../../lib/i18n.js';

const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const dayFmt = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'numeric' });

/** Giữ giờ cũ của deadline khi đổi ngày, nếu chưa có thì 17:00. */
function onDay(day, deadline) {
  const d = new Date(day);
  if (deadline) {
    const old = new Date(deadline);
    d.setHours(old.getHours(), old.getMinutes(), 0, 0);
  } else d.setHours(17, 0, 0, 0);
  return d.toISOString();
}

function Chip({ task, onOpen }) {
  const done = task.status === 'done';
  const late = isOverdue(task);
  return (
    <motion.button
      layout
      layoutId={`cal-${task._id}`}
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/task-id', task._id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(task._id);
      }}
      title={task.title}
      className={`flex w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 py-[3px] text-left text-[11px] font-medium transition-colors ${
        late ? 'bg-danger/12 text-danger' : done ? 'text-faint line-through' : 'bg-surface-3 hover:bg-line-strong'
      }`}
    >
      <span className="size-1.5 shrink-0 rounded-full" style={{ background: done ? 'var(--faint)' : PRIORITY[task.priority]?.color }} />
      <span className="truncate">{task.title}</span>
    </motion.button>
  );
}

export default function CalendarView({ tasks, projectId }) {
  const { openTask, newTask } = useUI();
  const update = useUpdateTask();
  const notify = useToast();
  const today = startOfDay(new Date());
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(today);
  const [dropKey, setDropKey] = useState(null);
  const [dir, setDir] = useState(0);

  const days = useMemo(() => monthGrid(month), [month]);
  const byDay = useMemo(() => {
    const map = new Map();
    for (const t of tasks) {
      if (!t.deadline) continue;
      const k = dayKey(new Date(t.deadline));
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(t);
    }
    for (const list of map.values()) list.sort((a, b) => (a.status === 'done') - (b.status === 'done') || new Date(a.deadline) - new Date(b.deadline));
    return map;
  }, [tasks]);
  const undated = tasks.filter((t) => !t.deadline && t.status !== 'done');
  const selectedTasks = byDay.get(dayKey(selected)) ?? [];

  const shift = (n) => {
    setDir(n);
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));
  };

  const drop = (e, day) => {
    e.preventDefault();
    setDropKey(null);
    const id = e.dataTransfer.getData('text/task-id');
    const task = tasks.find((t) => t._id === id);
    if (!task) return;
    if (task.deadline && isSameDay(task.deadline, day)) return;
    const deadline = onDay(day, task.deadline);
    update.mutate(
      { id, data: { deadline } },
      {
        onSuccess: () =>
          notify({
            message: tr('Đã dời “{title}” sang {date}', { title: task.title, date: dayFmt.format(day) }),
            action: { label: tr('Hoàn tác'), onClick: () => update.mutate({ id, data: { deadline: task.deadline ?? null } }) },
          }),
        onError: (err) => notify({ tone: 'error', message: err.message }),
      },
    );
  };

  const createOn = (day) => newTask({ project: projectId, deadline: onDay(day) });

  return (
    <div className="grid gap-3.5 lg:grid-cols-[1fr_300px]">
      <section className="rounded-[20px] border border-line bg-surface p-3 sm:p-4">
        <header className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-display text-[15px] font-bold whitespace-nowrap sm:text-base">{formatMonth(month)}</h3>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setDir(0);
                setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                setSelected(today);
              }}
              className="h-8 rounded-lg px-2.5 text-xs font-semibold whitespace-nowrap text-muted hover:bg-surface-2 hover:text-ink"
            >
              {tr('Hôm nay')}
            </button>
            <button
              type="button"
              onClick={() => shift(-1)}
              aria-label={tr('Tháng trước')}
              className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => shift(1)}
              aria-label={tr('Tháng sau')}
              className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-7 pb-1.5 text-center text-[11px] font-semibold text-faint">
          {WEEKDAYS.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>

        <div className="overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false} custom={dir}>
            <motion.div
              key={dayKey(month)}
              custom={dir}
              initial={{ opacity: 0, x: dir * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -40 }}
              transition={{ duration: 0.28, ease: [0.2, 0.75, 0.2, 1] }}
              className="grid grid-cols-7 gap-1"
            >
              {days.map((day) => {
                const k = dayKey(day);
                const list = byDay.get(k) ?? [];
                const inMonth = day.getMonth() === month.getMonth();
                const isToday = isSameDay(day, today);
                const isSel = isSameDay(day, selected);
                const open = list.filter((t) => t.status !== 'done');
                const hasLate = list.some((t) => isOverdue(t));
                return (
                  <div
                    key={k}
                    role="button"
                    tabIndex={0}
                    aria-label={tr('{date}, {n} việc', { date: dayFmt.format(day), n: list.length })}
                    aria-pressed={isSel}
                    onClick={() => setSelected(day)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSelected(day))}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDropKey(k);
                    }}
                    onDragLeave={() => setDropKey((v) => (v === k ? null : v))}
                    onDrop={(e) => drop(e, day)}
                    className={`group relative flex min-h-14 flex-col rounded-xl border p-1 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent sm:min-h-[104px] sm:p-1.5 ${
                      dropKey === k
                        ? 'border-accent bg-accent/10'
                        : isSel
                          ? 'border-accent/60 bg-surface-2'
                          : `border-transparent hover:bg-surface-2 ${inMonth ? 'bg-surface-2/45' : ''}`
                    } ${inMonth ? '' : 'opacity-40'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`grid size-6 place-items-center rounded-full text-xs font-semibold tabular-nums ${
                          isToday ? 'bg-accent text-white shadow-[0_0_0_3px_var(--accent-soft)]' : ''
                        }`}
                      >
                        {day.getDate()}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          createOn(day);
                        }}
                        aria-label={tr('Thêm việc ngày {date}', { date: dayFmt.format(day) })}
                        className="hidden size-6 place-items-center rounded-md text-faint opacity-0 group-hover:opacity-100 hover:bg-surface-3 hover:text-ink focus-visible:opacity-100 sm:grid"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>

                    {/* Điện thoại: chấm nhỏ */}
                    <div className="mt-auto flex justify-center gap-0.5 pb-0.5 sm:hidden">
                      {list.slice(0, 3).map((t) => (
                        <span
                          key={t._id}
                          className="size-1.5 rounded-full"
                          style={{ background: t.status === 'done' ? 'var(--faint)' : hasLate && isOverdue(t) ? 'var(--danger)' : PRIORITY[t.priority]?.color }}
                        />
                      ))}
                    </div>

                    {/* Máy tính: chip tên việc */}
                    <div className="mt-1 hidden flex-col gap-0.5 sm:flex">
                      {list.slice(0, 3).map((t) => (
                        <Chip key={t._id} task={t} onOpen={openTask} />
                      ))}
                      {list.length > 3 && <span className="px-1.5 text-[11px] font-semibold text-muted">{tr('+{n} việc', { n: list.length - 3 })}</span>}
                    </div>
                    {open.length > 0 && (
                      <span className="sr-only">
                        {open.length} {tr('việc chưa xong')}
                      </span>
                    )}
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
        <p className="mt-3 hidden text-xs text-faint sm:block">{tr('Kéo thả việc sang ngày khác để dời hạn. Nhấn dấu + trên ô để thêm việc cho ngày đó.')}</p>
      </section>

      <aside className="space-y-3.5">
        <section className="rounded-[20px] border border-line bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-sm font-bold first-letter:uppercase">{dayFmt.format(selected)}</h3>
            <button
              type="button"
              onClick={() => createOn(selected)}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-accent/12 px-2.5 text-xs font-semibold text-accent-hi hover:bg-accent/20"
            >
              <CalendarPlus className="size-3.5" aria-hidden="true" /> {tr('Thêm')}
            </button>
          </div>
          <ul className="-mx-2 mt-2">
            <AnimatePresence initial={false}>
              {selectedTasks.map((t) => (
                <TaskRow key={t._id} task={t} showProject={false} />
              ))}
            </AnimatePresence>
            {selectedTasks.length === 0 && <li className="px-2 py-3 text-[13px] text-faint">{tr('Không có việc nào đến hạn ngày này.')}</li>}
          </ul>
        </section>

        <section className="rounded-[20px] border border-line bg-surface p-4">
          <h3 className="flex items-center gap-2 font-display text-sm font-bold">
            <Inbox className="size-4 text-muted" aria-hidden="true" /> {tr('Chưa có hạn')}
            <span className="rounded-md bg-surface-3 px-1.5 font-sans text-[11px] text-muted">{undated.length}</span>
          </h3>
          <p className="mt-1 text-xs text-faint">{tr('Kéo vào lịch để đặt hạn chót.')}</p>
          <ul className="mt-3 space-y-1.5">
            {undated.slice(0, 12).map((t) => (
              <li key={t._id}>
                <Chip task={t} onOpen={openTask} />
              </li>
            ))}
            {undated.length === 0 && <li className="text-[13px] text-faint">{tr('Mọi việc đều đã có hạn.')}</li>}
          </ul>
        </section>
      </aside>
    </div>
  );
}

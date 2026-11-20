import { ArrowRight, CircleCheckBig, CirclePlus, FolderPlus, MoveRight, PartyPopper, RotateCcw, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useActivity } from '../../hooks/queries.js';
import { PRIORITIES, PRIORITY, STATUS, hueOf, hueStyle } from '../../lib/constants.js';
import { dayLabel, formatTime } from '../../lib/dates.js';
import TaskRow from '../task/TaskRow.jsx';
import { ProgressBar } from '../ui/Charts.jsx';
import { Card } from '../ui/Motion.jsx';
import { EmptyState, Skeleton } from '../ui/Overlay.jsx';
import Segmented from '../ui/Segmented.jsx';

/* ---------- Việc cần chú ý ---------- */

const FOCUS_EMPTY = {
  overdue: { title: 'Không có việc trễ hạn', body: 'Bạn đang theo kịp mọi deadline.' },
  today: { title: 'Hôm nay trống lịch', body: 'Không có việc nào đến hạn hôm nay.' },
  week: { title: 'Tuần tới nhẹ nhàng', body: 'Chưa có việc nào đến hạn trong 7 ngày tới.' },
};

export function FocusCard({ data }) {
  const focus = data?.focus;
  const [tab, setTab] = useState(null);
  const current = tab ?? (focus?.overdue.length ? 'overdue' : 'today');
  const items = focus?.[current] ?? [];

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-[15px] font-bold">Cần chú ý</h2>
        <Link to="/my-tasks" className="flex items-center gap-1 text-xs font-semibold text-accent-hi hover:underline">
          Tất cả <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
      <Segmented
        size="sm"
        className="mt-3 w-full [&>button]:flex-1"
        label="Lọc việc cần chú ý"
        value={current}
        onChange={setTab}
        options={[
          { value: 'overdue', label: 'Trễ hạn', count: focus?.overdue.length ?? 0, alert: true },
          { value: 'today', label: 'Hôm nay', count: focus?.today.length ?? 0 },
          { value: 'week', label: '7 ngày', count: focus?.week.length ?? 0 },
        ]}
      />
      <div className="-mx-2 mt-2 min-h-56 flex-1">
        {!data ? (
          <div className="space-y-3 p-3">
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.ul
              key={current}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.22 }}
              className="max-h-80 overflow-y-auto"
            >
              {items.length === 0 ? (
                <li>
                  <EmptyState icon={PartyPopper} {...FOCUS_EMPTY[current]} />
                </li>
              ) : (
                items.slice(0, 6).map((t) => <TaskRow key={t._id} task={t} />)
              )}
            </motion.ul>
          </AnimatePresence>
        )}
      </div>
    </Card>
  );
}

/* ---------- Tiến độ dự án ---------- */

export function ProjectsCard({ data }) {
  const projects = data?.projects ?? [];
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[15px] font-bold">Dự án</h2>
        <Link to="/projects" className="flex items-center gap-1 text-xs font-semibold text-accent-hi hover:underline">
          Xem tất cả <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
      <ul className="mt-4 space-y-4">
        {projects.slice(0, 5).map((p) => (
          <li key={p._id} style={hueStyle(p.color)}>
            <Link to={`/projects/${p._id}`} className="group block">
              <div className="flex items-center justify-between gap-2 text-[13px]">
                <span className="flex min-w-0 items-center gap-2 font-medium group-hover:text-accent-hi">
                  <span className="hue-dot size-2.5 shrink-0 rounded-full" />
                  <span className="truncate">{p.name}</span>
                </span>
                <span className="shrink-0 text-xs text-muted tabular-nums">
                  {p.done}/{p.total}
                  {p.overdue > 0 && <span className="ml-1.5 text-danger">{p.overdue} trễ</span>}
                </span>
              </div>
              <ProgressBar value={p.progress} color={hueOf(p.color)} className="mt-2 h-1.5" />
            </Link>
          </li>
        ))}
        {data && projects.length === 0 && <p className="text-[13px] text-muted">Chưa có dự án nào.</p>}
      </ul>
    </Card>
  );
}

/* ---------- Hoạt động ---------- */

const ACTIVITY = {
  task_created: { icon: CirclePlus, verb: 'đã tạo', color: 'var(--accent-hi)' },
  task_completed: { icon: CircleCheckBig, verb: 'đã hoàn thành', color: 'var(--success)' },
  task_reopened: { icon: RotateCcw, verb: 'đã mở lại', color: 'var(--warning)' },
  task_moved: { icon: MoveRight, verb: 'đã chuyển', color: 'var(--accent-hi)' },
  task_deleted: { icon: Trash2, verb: 'đã xoá', color: 'var(--danger)' },
  project_created: { icon: FolderPlus, verb: 'đã tạo dự án', color: 'var(--accent-hi)' },
};

export function ActivityCard() {
  const [type, setType] = useState('all');
  const { data: items = [], isLoading } = useActivity(type);

  const groups = [];
  for (const item of items.slice(0, 14)) {
    const label = dayLabel(item.createdAt);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }

  return (
    <Card className="p-5 lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-[15px] font-bold">Hoạt động gần đây</h2>
        <Segmented
          size="sm"
          label="Lọc hoạt động"
          value={type}
          onChange={setType}
          options={[
            { value: 'all', label: 'Tất cả' },
            { value: 'completed', label: 'Hoàn thành' },
            { value: 'created', label: 'Tạo mới' },
          ]}
        />
      </div>

      <div className="mt-4 max-h-96 overflow-y-auto pr-1">
        {isLoading && <Skeleton className="h-40" />}
        {!isLoading && items.length === 0 && <p className="py-6 text-center text-[13px] text-muted">Chưa có hoạt động nào.</p>}
        <AnimatePresence mode="popLayout" initial={false}>
          {groups.map((g) => (
            <motion.div key={`${type}-${g.label}`} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-4 last:mb-0">
              <p className="mb-2 text-xs font-semibold text-faint">{g.label}</p>
              <ol className="relative ml-2.5 space-y-3 border-l border-line pl-5">
                {g.items.map((a) => {
                  const meta = ACTIVITY[a.type] || ACTIVITY.task_created;
                  const Icon = meta.icon;
                  return (
                    <li key={a._id} className="relative">
                      <span
                        className="absolute top-0 -left-[31px] grid size-5 place-items-center rounded-full border-2 border-surface"
                        style={{ background: `color-mix(in oklab, ${meta.color} 22%, var(--surface))`, color: meta.color }}
                      >
                        <Icon className="size-3" aria-hidden="true" />
                      </span>
                      <p className="text-[13px] leading-snug">
                        <span className="text-muted">Bạn {meta.verb} </span>
                        <span className="font-medium">{a.type === 'project_created' ? a.projectName : a.taskTitle}</span>
                        {a.type === 'task_moved' && a.to && <span className="text-muted"> sang {STATUS[a.to]?.label}</span>}
                      </p>
                      <p className="mt-0.5 flex items-center gap-2 text-xs text-faint" style={hueStyle(a.projectColor)}>
                        {a.type !== 'project_created' && a.projectName && (
                          <span className="flex items-center gap-1.5">
                            <span className="hue-dot size-1.5 rounded-full" />
                            {a.projectName}
                          </span>
                        )}
                        <span>{formatTime(a.createdAt)}</span>
                      </p>
                    </li>
                  );
                })}
              </ol>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Card>
  );
}

/* ---------- Phân bố ---------- */

export function BreakdownCard({ data }) {
  const byStatus = data?.byStatus ?? { todo: 0, doing: 0, done: 0 };
  const byPriority = data?.byPriority ?? {};
  const total = byStatus.todo + byStatus.doing + byStatus.done;
  const maxP = Math.max(1, ...PRIORITIES.map((p) => byPriority[p] || 0));

  return (
    <Card className="p-5">
      <h2 className="font-display text-[15px] font-bold">Phân bố công việc</h2>
      <p className="mt-1 text-[13px] text-muted">{total} việc trong các dự án đang chạy</p>

      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-surface-3">
        {['done', 'doing', 'todo'].map((s, i) => (
          <motion.div
            key={s}
            style={{ background: STATUS[s].color }}
            initial={{ width: 0 }}
            animate={{ width: total ? `${(byStatus[s] / total) * 100}%` : 0 }}
            transition={{ duration: 1, delay: 0.2 + i * 0.1, ease: [0.16, 0.84, 0.24, 1] }}
            className="h-full first:rounded-l-full last:rounded-r-full"
          />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-3 gap-2 text-xs">
        {['todo', 'doing', 'done'].map((s) => (
          <li key={s}>
            <span className="flex items-center gap-1.5 text-muted">
              <span className="size-2 rounded-full" style={{ background: STATUS[s].color }} />
              {STATUS[s].label}
            </span>
            <span className="mt-0.5 block font-display text-base font-bold tabular-nums">{byStatus[s]}</span>
          </li>
        ))}
      </ul>

      <p className="mt-5 text-[13px] font-semibold">Việc đang mở theo ưu tiên</p>
      <ul className="mt-2.5 space-y-2.5">
        {PRIORITIES.map((p, i) => (
          <li key={p} className="grid grid-cols-[72px_1fr_24px] items-center gap-2 text-xs">
            <span className="text-muted">{PRIORITY[p].label}</span>
            <div className="h-2 overflow-hidden rounded-full bg-surface-3">
              <motion.div
                className="h-full rounded-full"
                style={{ background: PRIORITY[p].color }}
                initial={{ width: 0 }}
                animate={{ width: `${((byPriority[p] || 0) / maxP) * 100}%` }}
                transition={{ duration: 1, delay: 0.3 + i * 0.08, ease: [0.16, 0.84, 0.24, 1] }}
              />
            </div>
            <span className="text-right font-semibold tabular-nums">{byPriority[p] || 0}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

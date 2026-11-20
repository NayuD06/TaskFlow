import { CalendarClock, CalendarDays, CalendarRange, ChevronRight, CircleCheckBig, Inbox, PartyPopper, Plus, SearchX, Sun, TriangleAlert } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { useUI } from '../components/shell/UIContext.jsx';
import { ActiveFilters, EMPTY_FILTERS, FilterButton, applyFilters, tagsOf } from '../components/task/Filters.jsx';
import TaskRow from '../components/task/TaskRow.jsx';
import ConnectionError from '../components/ui/ConnectionError.jsx';
import { Card, RisePage, riseItem } from '../components/ui/Motion.jsx';
import { EmptyState, Skeleton } from '../components/ui/Overlay.jsx';
import { useProjects, useTasks } from '../hooks/queries.js';
import { hueStyle } from '../lib/constants.js';
import { dueBucket, quickDeadline } from '../lib/dates.js';
import { tr } from '../lib/i18n.js';

const GROUPS = [
  { key: 'overdue', label: tr('Trễ hạn'), icon: TriangleAlert, color: 'var(--danger)', hint: tr('Xử lý những việc này trước nhé') },
  { key: 'today', label: tr('Hôm nay'), icon: Sun, color: 'var(--warning)', quick: 'today' },
  { key: 'week', label: tr('7 ngày tới'), icon: CalendarRange, color: 'var(--accent-hi)', quick: 'tomorrow' },
  { key: 'later', label: tr('Sau này'), icon: CalendarDays, color: 'var(--muted)' },
  { key: 'none', label: tr('Chưa có hạn'), icon: Inbox, color: 'var(--faint)' },
];

function Group({ group, tasks }) {
  const { newTask } = useUI();
  const Icon = group.icon;
  return (
    <Card id={group.key} className="scroll-mt-24 p-2 sm:p-3">
      <header className="flex items-center justify-between gap-2 px-2 pt-1.5 pb-2">
        <h2 className="flex items-center gap-2.5">
          <span
            className="grid size-7 place-items-center rounded-lg"
            style={{ background: `color-mix(in oklab, ${group.color} 16%, transparent)`, color: group.color }}
          >
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <span className="font-display text-sm font-bold">{group.label}</span>
          <span className="rounded-md bg-surface-3 px-1.5 text-[11px] text-muted tabular-nums">{tasks.length}</span>
          {group.hint && <span className="hidden text-xs text-faint sm:inline">{group.hint}</span>}
        </h2>
        {group.quick && (
          <button
            type="button"
            onClick={() => newTask({ deadline: quickDeadline(group.quick) })}
            className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink"
            aria-label={tr('Thêm việc cho nhóm {label}', { label: group.label })}
          >
            <Plus className="size-4" />
          </button>
        )}
      </header>
      <ul>
        <AnimatePresence initial={false}>
          {tasks.map((t) => (
            <TaskRow key={t._id} task={t} />
          ))}
        </AnimatePresence>
      </ul>
    </Card>
  );
}

export default function MyTasks() {
  const location = useLocation();
  const [filter, setFilter] = useState('all');
  const [showDone, setShowDone] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const { data: projects = [] } = useProjects();
  const openQuery = useTasks({ status: 'open', sort: 'deadline' });
  const doneQuery = useTasks({ status: 'done', sort: 'newest' });

  const activeIds = useMemo(() => new Set(projects.map((p) => p._id)), [projects]);
  const inScope = (t) => activeIds.has(t.project?._id) && (filter === 'all' || t.project?._id === filter);

  const scoped = useMemo(
    () => (openQuery.data ?? []).filter(inScope),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [openQuery.data, activeIds, filter],
  );
  const visible = useMemo(() => applyFilters(scoped, filters), [scoped, filters]);
  const tagOptions = useMemo(() => tagsOf(scoped), [scoped]);

  const groups = useMemo(() => {
    const now = new Date();
    const out = Object.fromEntries(GROUPS.map((g) => [g.key, []]));
    for (const t of visible) out[dueBucket(t, now)].push(t);
    return out;
  }, [visible]);

  const recentDone = applyFilters((doneQuery.data ?? []).filter(inScope), filters).slice(0, 8);
  const openCount = Object.values(groups).reduce((n, list) => n + list.length, 0);
  const counts = useMemo(() => {
    const map = {};
    for (const t of openQuery.data ?? []) map[t.project?._id] = (map[t.project?._id] || 0) + 1;
    return map;
  }, [openQuery.data]);

  // /my-tasks#overdue: cuộn tới nhóm trễ hạn
  useEffect(() => {
    if (!location.hash || !openQuery.data) return;
    const el = document.getElementById(location.hash.slice(1));
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350);
  }, [location.hash, openQuery.data]);

  if (openQuery.isError && !openQuery.data) return <ConnectionError error={openQuery.error} onRetry={openQuery.refetch} />;

  return (
    <RisePage className="space-y-3.5">
      <motion.div variants={riseItem} className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight">{tr('Việc của tôi')}</h1>
          <p className="mt-1 text-[13px] text-muted">
            {openQuery.data ? tr('{openCount} việc đang mở, xếp theo hạn chót', { openCount }) : tr('Đang tải...')}
            {groups.overdue.length > 0 && (
              <span className="ml-1.5 font-semibold text-danger">
                · {groups.overdue.length} {tr('việc trễ hạn')}
              </span>
            )}
          </p>
        </div>
        <FilterButton value={filters} onChange={setFilters} tags={tagOptions} showDue={false} />
      </motion.div>

      <motion.div
        variants={riseItem}
        className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
        role="group"
        aria-label={tr('Lọc theo dự án')}
      >
        {[{ _id: 'all', name: tr('Tất cả dự án') }, ...projects].map((p) => {
          const active = filter === p._id;
          return (
            <button
              key={p._id}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(p._id)}
              style={hueStyle(p.color)}
              className={`relative flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium transition-colors ${
                active ? 'border-transparent text-ink' : 'border-line text-muted hover:border-line-strong hover:text-ink'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="mytask-filter"
                  className={`absolute inset-0 rounded-full ${p._id === 'all' ? 'bg-accent/15 ring-1 ring-accent/40' : 'hue-tint hue-ring'}`}
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              {p._id !== 'all' && <span className="hue-dot relative size-2 rounded-full" />}
              <span className="relative">{p.name}</span>
              <span className={`relative text-[11px] tabular-nums ${active ? 'text-ink' : 'text-faint'}`}>
                {p._id === 'all' ? (openQuery.data ?? []).filter((t) => activeIds.has(t.project?._id)).length : counts[p._id] || 0}
              </span>
            </button>
          );
        })}
      </motion.div>

      <ActiveFilters value={filters} onChange={setFilters} shown={visible.length} total={scoped.length} onClearAll={() => setFilters(EMPTY_FILTERS)} />

      {openQuery.isLoading ? (
        <div className="space-y-3.5">
          <Skeleton className="h-40 rounded-[20px]" />
          <Skeleton className="h-56 rounded-[20px]" />
        </div>
      ) : openCount === 0 && scoped.length > 0 ? (
        <Card>
          <EmptyState
            icon={SearchX}
            title={tr('Không có việc nào khớp bộ lọc')}
            body={tr('Thử bỏ bớt mức ưu tiên hoặc nhãn đang chọn.')}
            action={
              <button
                type="button"
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="h-9 rounded-xl border border-line px-3.5 text-[13px] font-semibold hover:bg-surface-2"
              >
                {tr('Bỏ lọc')}
              </button>
            }
          />
        </Card>
      ) : openCount === 0 ? (
        <Card>
          <EmptyState icon={PartyPopper} title={tr('Không còn việc nào đang mở')} body={tr('Bạn đã xử lý hết rồi. Nghỉ ngơi chút hoặc thêm việc mới nào.')} />
        </Card>
      ) : (
        GROUPS.filter((g) => groups[g.key].length > 0).map((g) => <Group key={g.key} group={g} tasks={groups[g.key]} />)
      )}

      {recentDone.length > 0 && (
        <Card className="p-2 sm:p-3">
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            aria-expanded={showDone}
            className="flex w-full items-center gap-2.5 px-2 py-1.5 text-left"
          >
            <motion.span animate={{ rotate: showDone ? 90 : 0 }} className="text-faint">
              <ChevronRight className="size-4" aria-hidden="true" />
            </motion.span>
            <span className="tone-success grid size-7 place-items-center rounded-lg">
              <CircleCheckBig className="size-4" aria-hidden="true" />
            </span>
            <span className="font-display text-sm font-bold">{tr('Hoàn thành gần đây')}</span>
            <span className="rounded-md bg-surface-3 px-1.5 text-[11px] text-muted tabular-nums">{recentDone.length}</span>
          </button>
          <AnimatePresence initial={false}>
            {showDone && (
              <motion.ul
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                {recentDone.map((t) => (
                  <TaskRow key={t._id} task={t} />
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </Card>
      )}

      <p className="flex items-center justify-center gap-1.5 pt-2 text-xs text-faint">
        <CalendarClock className="size-3.5" aria-hidden="true" /> {tr('Mẹo: nhấn N để thêm việc mới, / để tìm nhanh, ? để xem mọi phím tắt.')}
      </p>
    </RisePage>
  );
}

import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  CalendarDays,
  Eraser,
  FolderX,
  KanbanSquare,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import Board from '../components/project/Board.jsx';
import CalendarView from '../components/project/CalendarView.jsx';
import ListView from '../components/project/ListView.jsx';
import WaterCover from '../components/project/WaterCover.jsx';
import { useUI } from '../components/shell/UIContext.jsx';
import { ProgressRing } from '../components/ui/Charts.jsx';
import ConnectionError from '../components/ui/ConnectionError.jsx';
import { CountUp } from '../components/ui/Motion.jsx';
import { ConfirmDialog, EmptyState, Menu, Skeleton } from '../components/ui/Overlay.jsx';
import { ProjectTile } from '../components/ui/Pills.jsx';
import Segmented from '../components/ui/Segmented.jsx';
import { useToast } from '../components/ui/Toasts.jsx';
import { useClearDone, useDeleteProject, useProject, useSaveProject, useTasks } from '../hooks/queries.js';
import { PRIORITIES, PRIORITY, hueOf, hueStyle } from '../lib/constants.js';
import { usePersistentState } from '../lib/theme.js';

const fold = (s = '') => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

const VIEWS = [
  { value: 'board', label: 'Bảng', icon: KanbanSquare, hideLabelOnMobile: true },
  { value: 'list', label: 'Danh sách', icon: List, hideLabelOnMobile: true },
  { value: 'calendar', label: 'Lịch', icon: CalendarDays, hideLabelOnMobile: true },
];

function Stat({ label, value, tone }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-muted">{label}</p>
      <CountUp value={value} className={`font-display text-lg font-bold ${tone || ''}`} />
    </div>
  );
}

function Header({ project, tasks }) {
  const { editProject, newTask } = useUI();
  const save = useSaveProject();
  const remove = useDeleteProject();
  const clearDone = useClearDone();
  const notify = useToast();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(null);

  const s = useMemo(() => {
    const now = Date.now();
    const done = tasks.filter((t) => t.status === 'done').length;
    return {
      total: tasks.length,
      done,
      doing: tasks.filter((t) => t.status === 'doing').length,
      overdue: tasks.filter((t) => t.status !== 'done' && t.deadline && new Date(t.deadline) < now).length,
      progress: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
    };
  }, [tasks]);

  const archive = (value) =>
    save.mutate(
      { id: project._id, data: { archived: value } },
      {
        onSuccess: () => notify({ message: value ? 'Đã lưu trữ dự án' : 'Đã khôi phục dự án' }),
        onError: (err) => notify({ tone: 'error', message: err.message }),
      },
    );

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 0.84, 0.24, 1] }}
      style={hueStyle(project.color)}
      className="relative overflow-hidden rounded-[22px] border border-line bg-surface"
    >
      <WaterCover progress={s.progress} height={110} className="!absolute inset-x-0 bottom-0 opacity-45" />
      <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <Link to="/projects" className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink">
            <ArrowLeft className="size-3.5" aria-hidden="true" /> Tất cả dự án
          </Link>
          <div className="flex items-center gap-3.5">
            <ProjectTile project={project} size={52} className="!rounded-2xl" />
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 truncate font-display text-xl font-bold tracking-tight sm:text-2xl">
                {project.name}
                {project.archived && <span className="tone-warning rounded-full px-2 py-0.5 font-sans text-[11px] font-semibold">Đã lưu trữ</span>}
              </h1>
              <p className="mt-1 line-clamp-2 max-w-xl text-[13px] text-muted">{project.description || 'Chưa có mô tả cho dự án này.'}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-3">
            <ProgressRing value={s.progress} size={52} stroke={5} color={hueOf(project.color)}>
              <span className="text-xs font-bold tabular-nums">{s.progress}%</span>
            </ProgressRing>
            <div className="grid grid-cols-3 gap-4 sm:gap-6">
              <Stat label="Đã xong" value={s.done} />
              <Stat label="Đang làm" value={s.doing} tone="text-accent-hi" />
              <Stat label="Trễ hạn" value={s.overdue} tone={s.overdue ? 'text-danger' : ''} />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => editProject(project)}
              className="grid size-10 place-items-center rounded-xl border border-line bg-surface/70 text-muted backdrop-blur hover:text-ink"
              aria-label="Sửa dự án"
            >
              <Pencil className="size-4" />
            </button>
            <div className="rounded-xl border border-line bg-surface/70 backdrop-blur [&>div>button]:size-10">
              <Menu
                label="Tuỳ chọn dự án"
                trigger={<MoreHorizontal className="size-4" />}
                items={[
                  s.done > 0 && { label: `Dọn ${s.done} việc đã xong`, icon: Eraser, onClick: () => setConfirm('clear') },
                  project.archived
                    ? { label: 'Khôi phục dự án', icon: ArchiveRestore, onClick: () => archive(false) }
                    : { label: 'Lưu trữ dự án', icon: Archive, onClick: () => archive(true) },
                  { label: 'Xoá dự án', icon: Trash2, danger: true, onClick: () => setConfirm('delete') },
                ]}
              />
            </div>
            <button
              type="button"
              onClick={() => newTask({ project: project._id })}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-[13px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] hover:brightness-110"
            >
              <Plus className="size-4" aria-hidden="true" /> Việc mới
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirm === 'delete'}
        onClose={() => setConfirm(null)}
        title={`Xoá dự án “${project.name}”?`}
        body={`Toàn bộ ${s.total} công việc trong dự án cũng sẽ bị xoá và không thể khôi phục.`}
        confirmLabel="Xoá vĩnh viễn"
        onConfirm={() =>
          remove.mutate(project._id, {
            onSuccess: () => {
              notify({ message: `Đã xoá “${project.name}”` });
              navigate('/projects');
            },
            onError: (err) => notify({ tone: 'error', message: err.message }),
          })
        }
      />
      <ConfirmDialog
        open={confirm === 'clear'}
        onClose={() => setConfirm(null)}
        title="Dọn các việc đã xong?"
        body={`${s.done} việc ở cột Đã xong sẽ bị xoá khỏi dự án.`}
        confirmLabel="Dọn dẹp"
        onConfirm={() =>
          clearDone.mutate(project._id, {
            onSuccess: (res) => notify({ tone: 'success', message: `Đã dọn ${res?.deletedCount ?? s.done} việc` }),
            onError: (err) => notify({ tone: 'error', message: err.message }),
          })
        }
      />
    </motion.section>
  );
}

export default function ProjectPage() {
  const { id } = useParams();
  const [view, setView] = usePersistentState('taskflow-view', 'board');
  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState('');
  const projectQuery = useProject(id);
  const params = useMemo(() => ({ project: id, sort: 'board' }), [id]);
  const queryKey = useMemo(() => ['tasks', params], [params]);
  const { data: allTasks = [], isLoading } = useTasks(params, { placeholderData: undefined });

  const tasks = useMemo(() => {
    const q = fold(query.trim());
    return allTasks.filter((t) => (!priority || t.priority === priority) && (!q || fold(`${t.title} ${t.description || ''}`).includes(q)));
  }, [allTasks, query, priority]);

  const project = projectQuery.data;

  if (projectQuery.isError) {
    if (projectQuery.error?.status === 404 || projectQuery.error?.status === 400)
      return (
        <div className="rounded-[20px] border border-line bg-surface">
          <EmptyState
            icon={FolderX}
            title="Không tìm thấy dự án"
            body="Dự án này có thể đã bị xoá hoặc đường dẫn không đúng."
            action={
              <Link to="/projects" className="inline-flex h-10 items-center rounded-xl bg-accent px-4 text-[13px] font-semibold text-white">
                Về danh sách dự án
              </Link>
            }
          />
        </div>
      );
    return <ConnectionError error={projectQuery.error} onRetry={projectQuery.refetch} />;
  }

  if (!project)
    return (
      <div className="space-y-3.5">
        <Skeleton className="h-40 rounded-[22px]" />
        <Skeleton className="h-12 rounded-2xl" />
        <div className="grid gap-3 md:grid-cols-3">
          <Skeleton className="h-72 rounded-[20px]" />
          <Skeleton className="h-72 rounded-[20px]" />
          <Skeleton className="h-72 rounded-[20px]" />
        </div>
      </div>
    );

  const filtering = !!query || !!priority;

  return (
    <div className="space-y-3.5">
      <Header project={project} tasks={allTasks} />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex flex-wrap items-center gap-2"
      >
        <Segmented label="Kiểu hiển thị" value={view} onChange={setView} options={VIEWS} />
        <label className="relative order-last w-full sm:order-none sm:w-auto sm:min-w-40 sm:flex-1">
          <span className="sr-only">Tìm trong dự án</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm việc trong dự án"
            className="h-11 w-full rounded-xl border border-line bg-surface pr-9 pl-9 text-[13px] outline-none placeholder:text-faint focus:border-accent/60 focus:ring-4 focus:ring-accent/10"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Xoá tìm kiếm"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-faint hover:text-ink"
            >
              <X className="size-3.5" />
            </button>
          )}
        </label>
        <label className="ml-auto sm:ml-0">
          <span className="sr-only">Lọc theo ưu tiên</span>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-[13px] outline-none focus:border-accent/60"
          >
            <option value="">Mọi ưu tiên</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY[p].label}
              </option>
            ))}
          </select>
        </label>
      </motion.div>

      <AnimatePresence>
        {filtering && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-xs text-muted"
          >
            Đang hiện {tasks.length}/{allTasks.length} việc.{' '}
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setPriority('');
              }}
              className="font-semibold text-accent-hi hover:underline"
            >
              Bỏ lọc
            </button>
          </motion.p>
        )}
      </AnimatePresence>

      {isLoading ? (
        <Skeleton className="h-72 rounded-[20px]" />
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            {view === 'board' && <Board tasks={tasks} allTasks={allTasks} queryKey={queryKey} projectId={id} />}
            {view === 'list' && <ListView tasks={tasks} projectId={id} />}
            {view === 'calendar' && <CalendarView tasks={tasks} projectId={id} />}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

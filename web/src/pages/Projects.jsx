import { Archive, ArchiveRestore, FolderOpen, MoreHorizontal, Pencil, Plus, Search, Trash2, TriangleAlert, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import WaterCover from '../components/project/WaterCover.jsx';
import { useUI } from '../components/shell/UIContext.jsx';
import { ProgressBar } from '../components/ui/Charts.jsx';
import ConnectionError from '../components/ui/ConnectionError.jsx';
import { RisePage, riseItem } from '../components/ui/Motion.jsx';
import { ConfirmDialog, EmptyState, Menu, Skeleton } from '../components/ui/Overlay.jsx';
import { ProjectTile } from '../components/ui/Pills.jsx';
import Segmented from '../components/ui/Segmented.jsx';
import { useToast } from '../components/ui/Toasts.jsx';
import { useDeleteProject, useProjects, useSaveProject } from '../hooks/queries.js';
import { hueOf, hueStyle } from '../lib/constants.js';
import { relativeTime } from '../lib/dates.js';
import { usePersistentState } from '../lib/theme.js';

const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

const SORTS = {
  recent: { label: 'Mới cập nhật', fn: (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt) },
  open: { label: 'Nhiều việc mở', fn: (a, b) => b.stats.open - a.stats.open },
  progress: { label: 'Tiến độ cao', fn: (a, b) => b.stats.progress - a.stats.progress },
  name: { label: 'Tên A đến Z', fn: (a, b) => a.name.localeCompare(b.name, 'vi') },
};

function ProjectCard({ project, onArchive, onDelete }) {
  const { editProject } = useUI();
  const s = project.stats;
  return (
    <motion.article
      layout
      variants={riseItem}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      style={hueStyle(project.color)}
      className="group relative flex flex-col overflow-hidden rounded-[20px] border border-line bg-surface hover:border-line-strong hover:shadow-lift"
    >
      <WaterCover progress={s.progress} height={84} />
      <div className="absolute top-3 right-3 z-10">
        <Menu
          label={`Tuỳ chọn cho ${project.name}`}
          trigger={<MoreHorizontal className="size-4" />}
          items={[
            { label: 'Sửa', icon: Pencil, onClick: () => editProject(project) },
            project.archived
              ? { label: 'Khôi phục', icon: ArchiveRestore, onClick: () => onArchive(project, false) }
              : { label: 'Lưu trữ', icon: Archive, onClick: () => onArchive(project, true) },
            { label: 'Xoá dự án', icon: Trash2, danger: true, onClick: () => onDelete(project) },
          ]}
        />
      </div>

      <Link to={`/projects/${project._id}`} className="flex flex-1 flex-col px-5 pb-5 after:absolute after:inset-0 after:content-['']">
        <span className="-mt-6 w-fit rounded-[16px] border-4 border-surface bg-surface">
          <ProjectTile project={project} size={44} className="!rounded-[12px]" />
        </span>
        <h3 className="mt-3 truncate font-display text-[15px] font-bold group-hover:text-[color-mix(in_oklab,var(--hue)_70%,var(--ink))]">{project.name}</h3>
        <p className="mt-1 line-clamp-2 min-h-[2lh] text-[13px] leading-relaxed text-muted">{project.description || 'Chưa có mô tả.'}</p>

        <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] font-semibold">
          <span className="tone-muted rounded-full px-2 py-0.5">{s.open} đang mở</span>
          {s.doing > 0 && <span className="tone-accent rounded-full px-2 py-0.5">{s.doing} đang làm</span>}
          {s.overdue > 0 && (
            <span className="tone-danger inline-flex items-center gap-1 rounded-full px-2 py-0.5">
              <TriangleAlert className="size-3" aria-hidden="true" />
              {s.overdue} trễ hạn
            </span>
          )}
        </div>

        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">
              {s.done}/{s.total} việc xong
            </span>
            <span className="font-display font-bold tabular-nums">{s.progress}%</span>
          </div>
          <ProgressBar value={s.progress} color={hueOf(project.color)} className="mt-1.5 h-1.5" />
          <p className="mt-3 text-[11px] text-faint">Cập nhật {relativeTime(project.updatedAt)}</p>
        </div>
      </Link>
    </motion.article>
  );
}

export default function Projects() {
  const { newProject } = useUI();
  const [tab, setTab] = useState('false');
  const [query, setQuery] = useState('');
  const [sort, setSort] = usePersistentState('taskflow-project-sort', 'recent');
  const [confirm, setConfirm] = useState(null);
  const { data: projects, isLoading, isError, error, refetch } = useProjects(tab);
  const { data: archived = [] } = useProjects('true');
  const { data: active = [] } = useProjects('false');
  const save = useSaveProject();
  const remove = useDeleteProject();
  const notify = useToast();

  const shown = useMemo(() => {
    const q = fold(query.trim());
    const list = (projects ?? []).filter((p) => !q || fold(`${p.name} ${p.description || ''}`).includes(q));
    return [...list].sort((SORTS[sort] || SORTS.recent).fn);
  }, [projects, query, sort]);

  const onArchive = (project, value) =>
    save.mutate(
      { id: project._id, data: { archived: value } },
      {
        onSuccess: () =>
          notify({
            message: value ? `Đã lưu trữ “${project.name}”` : `Đã khôi phục “${project.name}”`,
            action: { label: 'Hoàn tác', onClick: () => save.mutate({ id: project._id, data: { archived: !value } }) },
          }),
        onError: (err) => notify({ tone: 'error', message: err.message }),
      },
    );

  const onDelete = (project) =>
    remove.mutate(project._id, {
      onSuccess: (res) => notify({ message: `Đã xoá “${project.name}” cùng ${res.deletedTasks} công việc` }),
      onError: (err) => notify({ tone: 'error', message: err.message }),
    });

  if (isError && !projects) return <ConnectionError error={error} onRetry={refetch} />;

  return (
    <RisePage className="space-y-4">
      <motion.div variants={riseItem} className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Dự án</h1>
          <p className="mt-1 text-[13px] text-muted">Mỗi dự án là một bể nước. Xong càng nhiều việc, nước càng dâng cao.</p>
        </div>
        <button
          type="button"
          onClick={newProject}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-[13px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] hover:brightness-110"
        >
          <Plus className="size-4" aria-hidden="true" /> Dự án mới
        </button>
      </motion.div>

      <motion.div variants={riseItem} className="flex flex-col gap-2.5 rounded-[18px] border border-line bg-surface p-2 sm:flex-row sm:items-center">
        <Segmented
          label="Lọc dự án"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'false', label: 'Đang chạy', count: active.length },
            { value: 'true', label: 'Lưu trữ', count: archived.length },
          ]}
        />
        <label className="relative flex-1">
          <span className="sr-only">Tìm dự án</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên hoặc mô tả"
            className="h-10 w-full rounded-xl bg-surface-2 pr-9 pl-9 text-[13px] outline-none placeholder:text-faint focus:ring-2 focus:ring-accent/50"
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
        <label className="flex items-center gap-2 text-[13px] text-muted">
          <span className="shrink-0 max-sm:sr-only">Sắp xếp</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-10 w-full rounded-xl bg-surface-2 px-3 text-[13px] text-ink outline-none focus:ring-2 focus:ring-accent/50 sm:w-auto"
          >
            {Object.entries(SORTS).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </motion.div>

      {isLoading ? (
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-64 rounded-[20px]" />
          ))}
        </div>
      ) : (
        <motion.div layout className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {shown.map((p) => (
              <ProjectCard key={p._id} project={p} onArchive={onArchive} onDelete={(project) => setConfirm(project)} />
            ))}
            {tab === 'false' && !query && (
              <motion.button
                layout
                key="new"
                type="button"
                onClick={newProject}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="group flex min-h-64 flex-col items-center justify-center gap-3 rounded-[20px] border-2 border-dashed border-line text-muted transition-colors hover:border-accent/60 hover:text-ink"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-surface-2 transition-transform group-hover:scale-110 group-hover:rotate-90">
                  <Plus className="size-5" aria-hidden="true" />
                </span>
                <span className="text-[13px] font-semibold">Tạo dự án mới</span>
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {!isLoading && shown.length === 0 && (query || tab === 'true') && (
        <EmptyState
          icon={query ? Search : FolderOpen}
          title={query ? 'Không tìm thấy dự án' : 'Chưa có dự án lưu trữ'}
          body={query ? `Không có dự án nào khớp với “${query}”.` : 'Dự án bạn lưu trữ sẽ nằm ở đây, có thể khôi phục bất cứ lúc nào.'}
        />
      )}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => onDelete(confirm)}
        title={`Xoá dự án “${confirm?.name}”?`}
        body={`Toàn bộ ${confirm?.stats.total ?? 0} công việc trong dự án cũng sẽ bị xoá và không thể khôi phục.`}
        confirmLabel="Xoá vĩnh viễn"
      />
    </RisePage>
  );
}

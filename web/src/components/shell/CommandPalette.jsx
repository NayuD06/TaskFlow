import { CircleCheckBig, CornerDownLeft, FolderKanban, LayoutDashboard, LogOut, Plus, Search, UserRound } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useProjects, useTasks } from '../../hooks/queries.js';
import { hueStyle } from '../../lib/constants.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { DueChip } from '../ui/Pills.jsx';
import { useUI } from './UIContext.jsx';

/** Bỏ dấu tiếng Việt để tìm "ban nhap" vẫn ra "bản nháp". */
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

function Highlight({ text, query }) {
  if (!query) return text;
  const i = fold(text).indexOf(fold(query));
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-accent-soft px-0.5 text-accent-hi">{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  );
}

export default function CommandPalette() {
  const { paletteOpen, closePalette, openTask, newTask, newProject } = useUI();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useTasks({ sort: 'newest' }, { enabled: paletteOpen });

  useEffect(() => {
    if (paletteOpen) {
      setQuery('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [paletteOpen]);

  const groups = useMemo(() => {
    const q = query.trim();
    const go = (to) => () => navigate(to);
    if (!q) {
      return [
        {
          label: 'Đi tới',
          items: [
            { id: 'g-home', icon: LayoutDashboard, title: 'Tổng quan', run: go('/') },
            { id: 'g-projects', icon: FolderKanban, title: 'Dự án', run: go('/projects') },
            { id: 'g-mine', icon: CircleCheckBig, title: 'Việc của tôi', run: go('/my-tasks') },
            { id: 'g-settings', icon: UserRound, title: 'Cài đặt tài khoản', run: go('/settings') },
          ],
        },
        {
          label: 'Tạo mới',
          items: [
            { id: 'n-task', icon: Plus, title: 'Việc mới', hint: 'N', run: () => newTask() },
            { id: 'n-project', icon: Plus, title: 'Dự án mới', run: () => newProject() },
          ],
        },
        {
          label: 'Dự án',
          items: projects.slice(0, 5).map((p) => ({ id: p._id, project: p, title: p.name, run: go(`/projects/${p._id}`) })),
        },
        { label: 'Tài khoản', items: [{ id: 'a-logout', icon: LogOut, title: 'Đăng xuất', run: logout }] },
      ];
    }
    const fq = fold(q);
    const matchedTasks = tasks
      .filter((t) => fold(t.title).includes(fq) || fold(t.description || '').includes(fq))
      .slice(0, 8)
      .map((t) => ({
        id: t._id,
        task: t,
        title: t.title,
        run: () => {
          navigate(`/projects/${t.project?._id}`);
          openTask(t._id);
        },
      }));
    const matchedProjects = projects
      .filter((p) => fold(p.name).includes(fq))
      .slice(0, 5)
      .map((p) => ({ id: p._id, project: p, title: p.name, run: go(`/projects/${p._id}`) }));
    return [
      { label: 'Công việc', items: matchedTasks },
      { label: 'Dự án', items: matchedProjects },
    ].filter((g) => g.items.length);
  }, [query, tasks, projects, navigate, newTask, newProject, openTask, logout]);

  const flat = groups.flatMap((g) => g.items);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const run = (item) => {
    closePalette();
    item?.run();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(flat[active]);
    } else if (e.key === 'Escape') {
      closePalette();
    }
  };

  let index = -1;

  return (
    <AnimatePresence>
      {paletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-3 pt-[12vh]">
          <motion.div
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePalette}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Tìm nhanh"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
            transition={{ duration: 0.3, ease: [0.2, 0.75, 0.2, 1] }}
            className="shadow-lift relative w-full max-w-xl overflow-hidden rounded-[20px] border border-line bg-surface"
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="size-[18px] text-muted" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Tìm công việc, dự án hoặc lệnh…"
                className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint"
                role="combobox"
                aria-expanded="true"
                aria-controls="palette-list"
              />
              <kbd className="rounded-md border border-line px-1.5 text-[11px] text-faint">Esc</kbd>
            </div>

            <div ref={listRef} id="palette-list" role="listbox" className="max-h-[52vh] overflow-y-auto p-2">
              {flat.length === 0 && <p className="px-3 py-8 text-center text-muted">Không tìm thấy kết quả cho “{query}”.</p>}
              {groups.map((g) => (
                <div key={g.label} className="mb-1">
                  <p className="px-3 pt-2 pb-1 text-xs font-medium text-faint">{g.label}</p>
                  {g.items.map((item) => {
                    index += 1;
                    const i = index;
                    const Icon = item.icon;
                    const selected = i === active;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        data-index={i}
                        onMouseMove={() => setActive(i)}
                        onClick={() => run(item)}
                        className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] ${
                          selected ? 'text-ink' : 'text-muted'
                        }`}
                      >
                        {selected && (
                          <motion.span
                            layoutId="palette-active"
                            className="absolute inset-0 rounded-xl bg-surface-2"
                            transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                          />
                        )}
                        <span className="relative flex min-w-0 flex-1 items-center gap-3">
                          {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
                          {item.project && !item.task && <span className="hue-dot size-2.5 shrink-0 rounded-full" style={hueStyle(item.project.color)} />}
                          {item.task && <span className="hue-dot size-2.5 shrink-0 rounded-full" style={hueStyle(item.task.project?.color)} />}
                          <span className={`truncate font-medium ${item.task?.status === 'done' ? 'line-through opacity-60' : ''}`}>
                            <Highlight text={item.title} query={query.trim()} />
                          </span>
                          {item.task && <span className="hidden truncate text-xs text-faint sm:inline">{item.task.project?.name}</span>}
                        </span>
                        {item.task && (
                          <span className="relative">
                            <DueChip task={item.task} />
                          </span>
                        )}
                        {item.hint && <kbd className="relative rounded-md border border-line px-1.5 text-[11px] text-faint">{item.hint}</kbd>}
                        {selected && <CornerDownLeft className="relative size-3.5 text-faint" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

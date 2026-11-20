import { ChevronRight, Menu, Moon, Plus, Search, Sun } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Link, useLocation, useMatch } from 'react-router';
import { useProject } from '../../hooks/queries.js';
import { useUI } from './UIContext.jsx';

function useCrumbs() {
  const { pathname } = useLocation();
  const match = useMatch('/projects/:id');
  const { data: project } = useProject(match?.params.id);
  if (pathname === '/') return [{ label: 'Tổng quan' }];
  if (pathname === '/my-tasks') return [{ label: 'Việc của tôi' }];
  if (pathname === '/projects') return [{ label: 'Dự án' }];
  if (match) return [{ label: 'Dự án', to: '/projects' }, { label: project?.name ?? '…' }];
  return [{ label: 'Không tìm thấy' }];
}

export default function Topbar({ theme, onToggleTheme, onOpenMenu }) {
  const crumbs = useCrumbs();
  const { openPalette, newTask } = useUI();
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <header className="sticky top-3.5 z-30 flex h-14 items-center gap-2 rounded-[18px] border border-line bg-surface/85 px-2.5 backdrop-blur-xl sm:gap-3 sm:px-3">
      <button
        type="button"
        onClick={onOpenMenu}
        className="grid size-9 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink lg:hidden"
        aria-label="Mở menu"
      >
        <Menu className="size-5" />
      </button>

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex min-w-0 items-center gap-1.5 text-[13px]">
          <li className="hidden text-faint sm:block">TaskFlow</li>
          {crumbs.map((c, i) => (
            <li key={`${c.label}-${i}`} className={`min-w-0 items-center gap-1.5 ${i < crumbs.length - 1 ? 'hidden sm:flex' : 'flex'}`}>
              <ChevronRight className={`size-3.5 shrink-0 text-faint ${i === 0 || i === crumbs.length - 1 ? 'max-sm:hidden' : ''}`} aria-hidden="true" />
              {c.to ? (
                <Link to={c.to} className="truncate text-muted hover:text-ink">
                  {c.label}
                </Link>
              ) : (
                <span className="truncate font-semibold">{c.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <button
        type="button"
        onClick={openPalette}
        className="flex h-9 items-center gap-2 rounded-xl border border-line bg-surface-2 px-2.5 text-[13px] text-muted hover:border-line-strong hover:text-ink sm:w-60"
        aria-label="Tìm nhanh"
      >
        <Search className="size-4" aria-hidden="true" />
        <span className="hidden flex-1 text-left sm:block">Tìm việc, dự án…</span>
        <kbd className="hidden rounded-md border border-line bg-surface px-1.5 font-sans text-[11px] text-faint sm:block">{isMac ? '⌘' : 'Ctrl'} K</kbd>
      </button>

      <button
        type="button"
        onClick={onToggleTheme}
        className="relative grid size-9 place-items-center overflow-hidden rounded-xl text-muted hover:bg-surface-2 hover:text-ink"
        aria-label={theme === 'light' ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng'}
        title="Đổi giao diện sáng / tối"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={theme}
            initial={{ y: 14, rotate: -60, opacity: 0 }}
            animate={{ y: 0, rotate: 0, opacity: 1 }}
            exit={{ y: -14, rotate: 60, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {theme === 'light' ? <Moon className="size-[18px]" /> : <Sun className="size-[18px]" />}
          </motion.span>
        </AnimatePresence>
      </button>

      <button
        type="button"
        onClick={() => newTask()}
        className="flex h-9 items-center gap-1.5 rounded-xl bg-accent px-3 font-semibold text-white shadow-[0_8px_20px_-10px_rgb(47_107_255/0.9)] hover:brightness-110"
        title="Việc mới (phím N)"
      >
        <Plus className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Việc mới</span>
      </button>
    </header>
  );
}

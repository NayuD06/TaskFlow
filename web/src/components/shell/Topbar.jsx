import { ChevronRight, Menu, Moon, Plus, Search, Sun } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { Link, useLocation, useMatch } from 'react-router';
import { useProject } from '../../hooks/queries.js';
import LangSwitch from '../ui/LangSwitch.jsx';
import Reminders from './Reminders.jsx';
import { useUI } from './UIContext.jsx';
import { tr } from '../../lib/i18n.js';

function useCrumbs() {
  const { pathname } = useLocation();
  const match = useMatch('/projects/:id');
  const { data: project } = useProject(match?.params.id);
  if (pathname === '/') return [{ label: tr('Tổng quan') }];
  if (pathname === '/my-tasks') return [{ label: tr('Việc của tôi') }];
  if (pathname === '/projects') return [{ label: tr('Dự án') }];
  if (pathname === '/settings') return [{ label: tr('Tài khoản') }];
  if (match) return [{ label: tr('Dự án'), to: '/projects' }, { label: project?.name ?? '…' }];
  return [{ label: 'TaskFlow' }];
}

export default function Topbar({ theme, onToggleTheme, onOpenMenu }) {
  const crumbs = useCrumbs();
  const pageTitle = crumbs[crumbs.length - 1]?.label;
  useEffect(() => {
    document.title = pageTitle && pageTitle !== '…' ? `${pageTitle} · TaskFlow` : 'TaskFlow';
  }, [pageTitle]);
  const { openPalette, newTask } = useUI();
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <header className="sticky top-3.5 z-30 flex h-14 items-center gap-2 rounded-[18px] border border-line bg-surface/85 px-2.5 backdrop-blur-xl sm:gap-3 sm:px-3">
      <button
        type="button"
        onClick={onOpenMenu}
        className="grid size-9 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink lg:hidden"
        aria-label={tr('Mở menu')}
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
        aria-label={tr('Tìm nhanh')}
      >
        <Search className="size-4" aria-hidden="true" />
        <span className="hidden min-w-0 flex-1 truncate text-left whitespace-nowrap sm:block">{tr('Tìm việc, dự án…')}</span>
        <kbd className="hidden rounded-md border border-line bg-surface px-1.5 font-sans text-[11px] text-faint sm:block">{isMac ? '⌘' : 'Ctrl'} K</kbd>
      </button>

      <LangSwitch className="hidden sm:flex" />

      <button
        type="button"
        onClick={onToggleTheme}
        className="relative grid size-9 place-items-center overflow-hidden rounded-xl text-muted hover:bg-surface-2 hover:text-ink"
        aria-label={theme === 'light' ? tr('Chuyển sang giao diện tối') : tr('Chuyển sang giao diện sáng')}
        title={tr('Đổi giao diện sáng / tối')}
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

      <Reminders />

      <button
        type="button"
        onClick={() => newTask()}
        className="flex h-9 items-center gap-1.5 rounded-xl bg-accent px-3 font-semibold text-white shadow-[0_8px_20px_-10px_var(--accent)] hover:brightness-110"
        title={tr('Việc mới (phím N)')}
      >
        <Plus className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">{tr('Việc mới')}</span>
      </button>
    </header>
  );
}

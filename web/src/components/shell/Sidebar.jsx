import { ChevronLeft, CircleCheckBig, FolderKanban, LayoutDashboard, LogOut, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { NavLink, useLocation } from 'react-router';
import { useDashboard, useProjects } from '../../hooks/queries.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Avatar } from '../auth/Fields.jsx';
import { useToast } from '../ui/Toasts.jsx';
import { hueStyle } from '../../lib/constants.js';
import { LogoMark, LogoWord } from './Logo.jsx';
import { useUI } from './UIContext.jsx';
import { tr } from '../../lib/i18n.js';

const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2, delay: 0.12 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

function NavItem({ to, icon: Icon, label, count, folded, end, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      title={folded ? label : undefined}
      className={({ isActive }) =>
        `relative flex h-10 items-center gap-3 rounded-xl px-[11px] text-[13px] font-semibold transition-colors ${
          isActive ? 'text-white' : 'text-muted hover:bg-surface-2 hover:text-ink'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="nav-pill"
              className="absolute inset-0 rounded-xl bg-accent shadow-[0_8px_24px_-10px_var(--accent)]"
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            />
          )}
          <Icon className="relative size-[18px] shrink-0" aria-hidden="true" />
          <AnimatePresence initial={false}>
            {!folded && (
              <motion.span {...fade} className="relative flex min-w-0 flex-1 items-center justify-between gap-2">
                <span className="truncate">{label}</span>
                {count !== undefined && (
                  <span className={`rounded-md px-1.5 text-[11px] tabular-nums ${isActive ? 'bg-black/20' : 'bg-surface-3'}`}>{count}</span>
                )}
              </motion.span>
            )}
          </AnimatePresence>
        </>
      )}
    </NavLink>
  );
}

function UserCard({ folded, onNavigate }) {
  const { user, logout } = useAuth();
  const notify = useToast();
  if (!user) return null;
  return (
    <div className={`mt-3 flex items-center gap-1 rounded-2xl bg-surface-2 p-1.5 ring-1 ring-line ${folded ? 'justify-center' : ''}`}>
      <NavLink
        to="/settings"
        onClick={onNavigate}
        title={folded ? tr('{name} · Cài đặt tài khoản', { name: user.name }) : tr('Cài đặt tài khoản')}
        className={({ isActive }) =>
          `flex min-w-0 flex-1 items-center gap-2.5 rounded-xl p-1 transition-colors hover:bg-surface-3 ${isActive ? 'bg-surface-3' : ''} ${folded ? 'flex-none' : ''}`
        }
      >
        <Avatar user={user} size={32} />
        <AnimatePresence initial={false}>
          {!folded && (
            <motion.span {...fade} className="min-w-0 leading-tight">
              <span className="block truncate text-[13px] font-semibold text-ink">{user.name}</span>
              <span className="block truncate text-[11px] text-muted">{user.isDemo ? tr('Tài khoản demo') : user.email}</span>
            </motion.span>
          )}
        </AnimatePresence>
      </NavLink>
      {!folded && (
        <button
          type="button"
          onClick={() => {
            logout();
            notify({ message: tr('Đã đăng xuất') });
          }}
          className="grid size-9 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface-3 hover:text-ink"
          aria-label={tr('Đăng xuất')}
          title={tr('Đăng xuất')}
        >
          <LogOut className="size-4" />
        </button>
      )}
    </div>
  );
}

export default function Sidebar({ folded, onToggleFold, onNavigate, mobile = false }) {
  const { data: projects = [] } = useProjects();
  const { data: dash } = useDashboard();
  const { newProject } = useUI();
  const location = useLocation();
  const recent = projects.slice(0, 5);

  return (
    <div className={`relative ${mobile ? 'h-full' : 'h-[calc(100dvh-28px)]'}`}>
      <motion.aside
        initial={false}
        animate={{ width: folded ? 76 : 248 }}
        transition={{ duration: 0.45, ease: [0.2, 0.75, 0.2, 1] }}
        className="flex h-full shrink-0 flex-col overflow-hidden rounded-[22px] border border-line bg-surface p-[14px]"
        aria-label={tr('Điều hướng chính')}
      >
        <div className="flex h-10 items-center gap-2.5 px-[6px]">
          <LogoMark size={34} />
          <AnimatePresence initial={false}>
            {!folded && (
              <motion.span {...fade}>
                <LogoWord className="text-ink" />
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <nav className="mt-6 space-y-1">
          <NavItem to="/" end icon={LayoutDashboard} label={tr('Tổng quan')} folded={folded} onNavigate={onNavigate} />
          <NavItem to="/projects" icon={FolderKanban} label={tr('Dự án')} count={projects.length} folded={folded} onNavigate={onNavigate} />
          <NavItem to="/my-tasks" icon={CircleCheckBig} label={tr('Việc của tôi')} count={dash?.stats.open} folded={folded} onNavigate={onNavigate} />
        </nav>

        <div className="mt-7 min-h-0 flex-1 overflow-y-auto">
          <div className="flex h-6 items-center px-[11px]">
            <AnimatePresence initial={false}>
              {!folded && (
                <motion.p {...fade} className="text-xs font-medium text-faint">
                  {tr('Dự án gần đây')}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          <ul className="mt-1 space-y-0.5">
            {recent.map((p) => {
              const active = location.pathname === `/projects/${p._id}`;
              return (
                <li key={p._id}>
                  <NavLink
                    to={`/projects/${p._id}`}
                    onClick={onNavigate}
                    title={folded ? p.name : undefined}
                    className={`flex h-10 items-center gap-3 rounded-xl px-[7px] text-[13px] font-medium transition-colors ${
                      active ? 'bg-surface-2 text-ink' : 'text-muted hover:bg-surface-2 hover:text-ink'
                    }`}
                    style={hueStyle(p.color)}
                  >
                    <span className="hue-tint hue-ring hue-text grid size-[26px] shrink-0 place-items-center rounded-lg font-display text-[11px] font-bold">
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                    <AnimatePresence initial={false}>
                      {!folded && (
                        <motion.span {...fade} className="flex min-w-0 flex-1 items-center justify-between gap-2">
                          <span className="truncate">{p.name}</span>
                          <span className="text-[11px] text-faint tabular-nums">{p.stats.open}</span>
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </NavLink>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() => {
              onNavigate?.();
              newProject();
            }}
            title={folded ? tr('Dự án mới') : undefined}
            className="mt-1 flex h-10 w-full items-center gap-3 rounded-xl px-[11px] text-[13px] font-medium text-muted hover:bg-surface-2 hover:text-ink"
          >
            <Plus className="size-[18px] shrink-0" aria-hidden="true" />
            <AnimatePresence initial={false}>{!folded && <motion.span {...fade}>{tr('Dự án mới')}</motion.span>}</AnimatePresence>
          </button>
        </div>

        <UserCard folded={folded} onNavigate={onNavigate} />
      </motion.aside>

      {/* Nút thu gọn nằm trên mép phải của thanh bên, ngang hàng logo */}
      {!mobile && (
        <button
          type="button"
          onClick={onToggleFold}
          className="absolute top-[21px] -right-[13px] z-10 grid size-[26px] place-items-center rounded-full border border-line-strong bg-surface text-muted shadow-[0_4px_12px_-4px_rgb(0_0_0/0.35)] transition-colors hover:border-accent hover:bg-accent hover:text-white"
          title={folded ? tr('Mở rộng thanh bên (Ctrl + B)') : tr('Thu gọn thanh bên (Ctrl + B)')}
          aria-label={folded ? tr('Mở rộng thanh bên') : tr('Thu gọn thanh bên')}
          aria-expanded={!folded}
        >
          <motion.span initial={false} animate={{ rotate: folded ? 180 : 0 }} transition={{ duration: 0.35 }} className="grid place-items-center">
            <ChevronLeft className="size-4" strokeWidth={2.5} aria-hidden="true" />
          </motion.span>
        </button>
      )}
    </div>
  );
}

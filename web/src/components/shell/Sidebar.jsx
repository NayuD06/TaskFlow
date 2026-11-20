import { CircleCheckBig, FolderKanban, LayoutDashboard, PanelLeftClose, PanelLeftOpen, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { NavLink, useLocation } from 'react-router';
import { useDashboard, useProjects } from '../../hooks/queries.js';
import { hueStyle } from '../../lib/constants.js';
import { LogoMark, LogoWord } from './Logo.jsx';
import { useUI } from './UIContext.jsx';

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
          isActive ? 'text-white' : 'text-rail-ink hover:bg-white/[0.06] hover:text-white'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="nav-pill"
              className="absolute inset-0 rounded-xl bg-accent shadow-[0_8px_24px_-10px_rgb(47_107_255/0.9)]"
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            />
          )}
          <Icon className="relative size-[18px] shrink-0" aria-hidden="true" />
          <AnimatePresence initial={false}>
            {!folded && (
              <motion.span {...fade} className="relative flex min-w-0 flex-1 items-center justify-between gap-2">
                <span className="truncate">{label}</span>
                {count !== undefined && (
                  <span className={`rounded-md px-1.5 text-[11px] tabular-nums ${isActive ? 'bg-white/20' : 'bg-white/[0.07]'}`}>{count}</span>
                )}
              </motion.span>
            )}
          </AnimatePresence>
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ folded, onToggleFold, onNavigate, mobile = false }) {
  const { data: projects = [] } = useProjects();
  const { data: dash } = useDashboard();
  const { newProject } = useUI();
  const location = useLocation();
  const recent = projects.slice(0, 5);

  return (
    <motion.aside
      initial={false}
      animate={{ width: folded ? 76 : 248 }}
      transition={{ duration: 0.45, ease: [0.2, 0.75, 0.2, 1] }}
      className={`flex shrink-0 flex-col overflow-hidden rounded-[22px] border border-white/[0.06] bg-rail p-[14px] ${
        mobile ? 'h-full' : 'sticky top-3.5 h-[calc(100dvh-28px)]'
      }`}
      aria-label="Điều hướng chính"
    >
      <div className="flex h-10 items-center gap-2.5 px-[6px]">
        <LogoMark size={34} />
        <AnimatePresence initial={false}>
          {!folded && (
            <motion.span {...fade}>
              <LogoWord />
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <nav className="mt-6 space-y-1">
        <NavItem to="/" end icon={LayoutDashboard} label="Tổng quan" folded={folded} onNavigate={onNavigate} />
        <NavItem to="/projects" icon={FolderKanban} label="Dự án" count={projects.length} folded={folded} onNavigate={onNavigate} />
        <NavItem to="/my-tasks" icon={CircleCheckBig} label="Việc của tôi" count={dash?.stats.open} folded={folded} onNavigate={onNavigate} />
      </nav>

      <div className="mt-7 min-h-0 flex-1 overflow-y-auto">
        <div className="flex h-6 items-center px-[11px]">
          <AnimatePresence initial={false}>
            {!folded && (
              <motion.p {...fade} className="text-xs font-medium text-rail-ink/70">
                Dự án gần đây
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
                    active ? 'bg-white/[0.08] text-white' : 'text-rail-ink hover:bg-white/[0.05] hover:text-white'
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
                        <span className="text-[11px] text-rail-ink/70 tabular-nums">{p.stats.open}</span>
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
          title={folded ? 'Dự án mới' : undefined}
          className="mt-1 flex h-10 w-full items-center gap-3 rounded-xl px-[11px] text-[13px] font-medium text-rail-ink hover:bg-white/[0.05] hover:text-white"
        >
          <Plus className="size-[18px] shrink-0" aria-hidden="true" />
          <AnimatePresence initial={false}>{!folded && <motion.span {...fade}>Dự án mới</motion.span>}</AnimatePresence>
        </button>
      </div>

      {!mobile && (
        <button
          type="button"
          onClick={onToggleFold}
          className="mt-3 flex h-10 items-center gap-3 rounded-xl px-[11px] text-[13px] font-medium text-rail-ink hover:bg-white/[0.06] hover:text-white"
          title="Thu gọn / mở rộng (Ctrl + B)"
          aria-label={folded ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
        >
          {folded ? <PanelLeftOpen className="size-[18px] shrink-0" /> : <PanelLeftClose className="size-[18px] shrink-0" />}
          <AnimatePresence initial={false}>{!folded && <motion.span {...fade}>Thu gọn</motion.span>}</AnimatePresence>
        </button>
      )}
    </motion.aside>
  );
}

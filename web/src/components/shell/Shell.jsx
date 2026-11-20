import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { usePersistentState, useTheme } from '../../lib/theme.js';
import ProjectDialog from '../project/ProjectDialog.jsx';
import TaskSheet from '../task/TaskSheet.jsx';
import CommandPalette from './CommandPalette.jsx';
import ShortcutsDialog from './ShortcutsDialog.jsx';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import { useUI } from './UIContext.jsx';

export default function Shell() {
  const { theme, toggle } = useTheme();
  const [folded, setFolded] = usePersistentState('taskflow-sidebar-folded', false);
  const [drawer, setDrawer] = useState(false);
  const { openPalette, newTask, sheet, paletteOpen, projectDialog, shortcutsOpen, openShortcuts } = useUI();
  const location = useLocation();
  const navigate = useNavigate();
  const pendingG = useRef(0);

  useEffect(() => {
    setDrawer(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  // Phím tắt: Ctrl/⌘ + K hoặc / tìm nhanh, Ctrl/⌘ + B thu gọn thanh bên, N việc mới, ? bảng phím tắt, G rồi D/P/M/S để chuyển trang
  useEffect(() => {
    const GO = { d: '/', p: '/projects', m: '/my-tasks', s: '/settings' };
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (mod && key === 'k') {
        e.preventDefault();
        openPalette();
        return;
      }
      if (mod && key === 'b') {
        e.preventDefault();
        setFolded((v) => !v);
        return;
      }
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
      const busy = sheet || paletteOpen || projectDialog || shortcutsOpen || document.querySelector('[role="dialog"][aria-modal="true"]');
      if (mod || e.altKey || typing || busy) return;

      if (Date.now() - pendingG.current < 1200 && GO[key]) {
        e.preventDefault();
        pendingG.current = 0;
        navigate(GO[key]);
      } else if (key === 'g') {
        pendingG.current = Date.now();
      } else if (key === 'n') {
        e.preventDefault();
        newTask();
      } else if (e.key === '/') {
        e.preventDefault();
        openPalette();
      } else if (e.key === '?') {
        e.preventDefault();
        openShortcuts();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openPalette, newTask, setFolded, sheet, paletteOpen, projectDialog, shortcutsOpen, openShortcuts, navigate]);

  return (
    <div className="min-h-dvh p-2.5 sm:p-3.5 lg:flex lg:items-start lg:gap-5">
      <div className="sticky top-3.5 z-20 hidden self-start lg:block">
        <Sidebar folded={folded} onToggleFold={() => setFolded((v) => !v)} />
      </div>

      <AnimatePresence>
        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawer(false)}
            />
            <motion.div
              className="absolute inset-y-2 left-2"
              initial={{ x: '-110%' }}
              animate={{ x: 0 }}
              exit={{ x: '-110%' }}
              transition={{ duration: 0.4, ease: [0.2, 0.75, 0.2, 1] }}
            >
              <Sidebar folded={false} mobile onNavigate={() => setDrawer(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="min-w-0 flex-1">
        <Topbar theme={theme} onToggleTheme={toggle} onOpenMenu={() => setDrawer(true)} />
        <main className="mt-3.5">
          <Outlet />
        </main>
      </div>

      <TaskSheet />
      <CommandPalette />
      <ShortcutsDialog />
      <ProjectDialog />
    </div>
  );
}

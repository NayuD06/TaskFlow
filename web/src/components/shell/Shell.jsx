import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { usePersistentState, useTheme } from '../../lib/theme.js';
import ProjectDialog from '../project/ProjectDialog.jsx';
import TaskSheet from '../task/TaskSheet.jsx';
import CommandPalette from './CommandPalette.jsx';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import { useUI } from './UIContext.jsx';

export default function Shell() {
  const { theme, toggle } = useTheme();
  const [folded, setFolded] = usePersistentState('taskflow-sidebar-folded', false);
  const [drawer, setDrawer] = useState(false);
  const { openPalette, newTask, sheet, paletteOpen } = useUI();
  const location = useLocation();

  useEffect(() => {
    setDrawer(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  // Phím tắt: Ctrl/⌘ + K tìm nhanh, Ctrl/⌘ + B thu gọn thanh bên, N việc mới
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openPalette();
      } else if (mod && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setFolded((v) => !v);
      } else if (!mod && !e.altKey && !typing && !sheet && !paletteOpen && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        newTask();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openPalette, newTask, setFolded, sheet, paletteOpen]);

  return (
    <div className="min-h-dvh p-2.5 sm:p-3.5 lg:flex lg:items-start lg:gap-3.5">
      <div className="hidden lg:block">
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
      <ProjectDialog />
    </div>
  );
}

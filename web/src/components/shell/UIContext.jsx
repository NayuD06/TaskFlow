import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const UIContext = createContext(null);

export const useUI = () => useContext(UIContext);

/**
 * Trạng thái giao diện dùng chung: sheet chi tiết task, hộp tìm nhanh, hộp thoại dự án, bảng phím tắt.
 * sheet: null | { mode: 'edit', id } | { mode: 'create', defaults }
 */
export function UIProvider({ children }) {
  const [sheet, setSheet] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [projectDialog, setProjectDialog] = useState(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const openTask = useCallback((id) => setSheet({ mode: 'edit', id }), []);
  const newTask = useCallback((defaults = {}) => setSheet({ mode: 'create', defaults }), []);
  const closeSheet = useCallback(() => setSheet(null), []);
  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);
  const newProject = useCallback(() => setProjectDialog({ project: null }), []);
  const editProject = useCallback((project) => setProjectDialog({ project }), []);
  const closeProjectDialog = useCallback(() => setProjectDialog(null), []);
  const openShortcuts = useCallback(() => setShortcutsOpen(true), []);
  const closeShortcuts = useCallback(() => setShortcutsOpen(false), []);

  const value = useMemo(
    () => ({
      sheet,
      openTask,
      newTask,
      closeSheet,
      paletteOpen,
      openPalette,
      closePalette,
      projectDialog,
      newProject,
      editProject,
      closeProjectDialog,
      shortcutsOpen,
      openShortcuts,
      closeShortcuts,
    }),
    [
      sheet,
      openTask,
      newTask,
      closeSheet,
      paletteOpen,
      openPalette,
      closePalette,
      projectDialog,
      newProject,
      editProject,
      closeProjectDialog,
      shortcutsOpen,
      openShortcuts,
      closeShortcuts,
    ],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

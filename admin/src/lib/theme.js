import { useCallback, useState } from 'react';

const KEY = 'taskflow-admin-theme';

export function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'dark');
  const toggle = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'light' ? '#edf1f7' : '#121b2d');
      try {
        localStorage.setItem(KEY, next);
      } catch {
        /* bỏ qua */
      }
      return next;
    });
  }, []);
  return { theme, toggle };
}

import { useCallback, useEffect, useState } from 'react';

const KEY = 'taskflow-theme';

export function readTheme() {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function useTheme() {
  const [theme, setTheme] = useState(readTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#edf1f7' : '#04060b');
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* trình duyệt chặn localStorage thì thôi */
    }
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === 'light' ? 'dark' : 'light')), []);
  return { theme, toggle };
}

/** Lưu trạng thái nhỏ (vd sidebar thu gọn) vào localStorage, an toàn khi bị chặn. */
export function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : JSON.parse(raw);
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* bỏ qua */
    }
  }, [key, value]);
  return [value, setValue];
}

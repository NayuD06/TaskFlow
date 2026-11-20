import { useCallback, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

const KEY = 'taskflow-theme';
export const THEME_COLORS = { dark: '#121b2d', light: '#edf1f7' };

export function readTheme() {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* trình duyệt chặn localStorage thì thôi */
  }
}

// Tâm của gợn nước: giữa nút vừa bấm (chuột hay bàn phím đều đúng), không có thì góc trên bên phải
function originOf(event) {
  const rect = event?.currentTarget?.getBoundingClientRect?.();
  if (rect && rect.width) return [rect.left + rect.width / 2, rect.top + rect.height / 2];
  return [window.innerWidth - 48, 40];
}

export function useTheme() {
  const [theme, setTheme] = useState(readTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggle = useCallback(
    (event) => {
      const next = theme === 'light' ? 'dark' : 'light';
      const swap = () => {
        applyTheme(next);
        flushSync(() => setTheme(next));
      };
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (reduce) return swap();

      const root = document.documentElement;
      if (!document.startViewTransition) {
        // Trình duyệt chưa hỗ trợ View Transitions: chuyển màu mờ dần
        root.classList.add('theme-fade');
        swap();
        window.setTimeout(() => root.classList.remove('theme-fade'), 450);
        return undefined;
      }

      // Màu mới lan ra như một gợn nước từ chỗ vừa bấm
      const [x, y] = originOf(event);
      const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      root.classList.add('theme-ripple');
      const transition = document.startViewTransition(swap);
      transition.ready
        .then(() =>
          root.animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
            { duration: 650, easing: 'cubic-bezier(0.2, 0.75, 0.2, 1)', pseudoElement: '::view-transition-new(root)' },
          ),
        )
        .catch(() => {});
      transition.finished.finally(() => root.classList.remove('theme-ripple'));
      return undefined;
    },
    [theme],
  );
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

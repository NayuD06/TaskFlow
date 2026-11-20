const KEY = 'taskflow-accent';

/** Đổi màu nhấn của cả ứng dụng (xem các biến --accent trong index.css). */
export function applyAccent(color) {
  const root = document.documentElement;
  const value = color && color !== 'blue' ? color : '';
  if (value) root.dataset.accent = value;
  else delete root.dataset.accent;
  try {
    if (value) localStorage.setItem(KEY, value);
    else localStorage.removeItem(KEY);
  } catch {
    /* bỏ qua */
  }
}

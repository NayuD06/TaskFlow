// Đồng hồ Pomodoro gắn với một công việc: 25 phút tập trung, 5 phút nghỉ (15 phút sau mỗi 4 phiên).
// Lưu trong localStorage nên tải lại trang hay đóng mở tab vẫn chạy tiếp đúng giờ.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLogPomodoro } from '../../hooks/queries.js';
import { tr } from '../../lib/i18n.js';
import { useToast } from '../ui/Toasts.jsx';

const KEY = 'taskflow-pomodoro';
const LOGGED_KEY = 'taskflow-pomodoro-logged';
const MIN = 60 * 1000;
export const FOCUS_CHOICES = [15, 25, 50];
const SHORT_BREAK = 5;
const LONG_BREAK = 15;

const PomodoroContext = createContext(null);
export const usePomodoro = () => useContext(PomodoroContext);

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    return raw && raw.taskId ? raw : null;
  } catch {
    return null;
  }
}

function persist(state) {
  try {
    if (state) localStorage.setItem(KEY, JSON.stringify(state));
    else localStorage.removeItem(KEY);
  } catch {
    /* không lưu được thì chỉ chạy trong tab này */
  }
}

/** Ghi nhận mỗi phiên đúng một lần, kể cả khi mở TaskFlow ở nhiều tab. */
function claim(id) {
  try {
    if (localStorage.getItem(LOGGED_KEY) === id) return false;
    localStorage.setItem(LOGGED_KEY, id);
  } catch {
    /* bỏ qua */
  }
  return true;
}

/** Tiếng "ting" ngắn bằng Web Audio, không cần file âm thanh. */
function chime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.65);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {
    /* trình duyệt không cho phát âm thanh */
  }
}

function systemNotify(title, body) {
  try {
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      new Notification(title, { body, icon: '/icons/icon-192.png', tag: 'taskflow-pomodoro' });
    }
  } catch {
    /* bỏ qua */
  }
}

/** Thời gian còn lại (ms) của phiên hiện tại. */
export const remainingOf = (state, now = Date.now()) => (state ? (state.endsAt ? Math.max(0, state.endsAt - now) : state.remaining) : 0);

export function PomodoroProvider({ children }) {
  const [state, setState] = useState(load);
  const [now, setNow] = useState(Date.now);
  const notify = useToast();
  const log = useLogPomodoro();
  const logRef = useRef(log);
  logRef.current = log;

  const update = useCallback((next) => {
    setState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      persist(value);
      return value;
    });
  }, []);

  // Đồng bộ giữa các tab
  useEffect(() => {
    const onStorage = (e) => e.key === KEY && setState(load());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const running = !!state?.endsAt;
  useEffect(() => {
    if (!running) return undefined;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);

  // Hết giờ: ghi phiên tập trung lên máy chủ rồi chuyển sang nghỉ, hoặc hết nghỉ thì chờ phiên mới
  useEffect(() => {
    if (!state?.endsAt || state.endsAt > now) return;
    const finished = state;
    if (finished.phase === 'focus') {
      const round = (finished.round || 0) + 1;
      const rest = round % 4 === 0 ? LONG_BREAK : SHORT_BREAK;
      if (claim(`${finished.taskId}:${finished.endsAt}`)) {
        logRef.current.mutate({ taskId: finished.taskId, minutes: finished.minutes }, { onError: (err) => notify({ tone: 'error', message: err.message }) });
        chime();
        systemNotify(tr('Xong một phiên tập trung!'), tr('Nghỉ {n} phút nhé. “{title}”', { n: rest, title: finished.title }));
        notify({ tone: 'success', message: tr('Xong {n} phút tập trung! Nghỉ {m} phút nhé.', { n: finished.minutes, m: rest }) });
      }
      update({ ...finished, phase: 'break', round, breakMinutes: rest, endsAt: finished.endsAt + rest * MIN, remaining: rest * MIN });
    } else {
      if (claim(`break:${finished.taskId}:${finished.endsAt}`)) {
        chime();
        systemNotify(tr('Hết giờ nghỉ'), tr('Sẵn sàng cho phiên tiếp theo chưa?'));
        notify({ message: tr('Hết giờ nghỉ. Bấm bắt đầu khi bạn sẵn sàng.') });
      }
      update({ ...finished, phase: 'focus', endsAt: null, remaining: finished.minutes * MIN });
    }
  }, [now, state, update, notify]);

  const start = useCallback(
    ({ taskId, title, minutes = 25 }) => {
      if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
      const sameTask = state?.taskId === taskId;
      update({ taskId, title, minutes, phase: 'focus', round: sameTask ? state.round || 0 : 0, endsAt: Date.now() + minutes * MIN, remaining: minutes * MIN });
      setNow(Date.now());
    },
    [state, update],
  );

  const pause = useCallback(() => update((s) => (s?.endsAt ? { ...s, remaining: Math.max(0, s.endsAt - Date.now()), endsAt: null } : s)), [update]);
  const resume = useCallback(() => {
    update((s) => (s && !s.endsAt ? { ...s, endsAt: Date.now() + s.remaining } : s));
    setNow(Date.now());
  }, [update]);
  const stop = useCallback(() => update(null), [update]);
  /** Bỏ qua giờ nghỉ, vào phiên tập trung mới luôn. */
  const skipBreak = useCallback(() => {
    update((s) => (s ? { ...s, phase: 'focus', endsAt: Date.now() + s.minutes * MIN, remaining: s.minutes * MIN } : s));
    setNow(Date.now());
  }, [update]);
  const rename = useCallback((taskId, title) => update((s) => (s?.taskId === taskId && s.title !== title ? { ...s, title } : s)), [update]);

  const value = useMemo(
    () => ({ state, now, remaining: remainingOf(state, now), start, pause, resume, stop, skipBreak, rename }),
    [state, now, start, pause, resume, stop, skipBreak, rename],
  );
  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
}

export const formatClock = (ms) => {
  const total = Math.ceil(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

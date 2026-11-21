import { Coffee, Pause, Play, SkipForward, Timer, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { tr } from '../../lib/i18n.js';
import { useUI } from '../shell/UIContext.jsx';
import { formatClock, usePomodoro } from './Pomodoro.jsx';

const MIN = 60 * 1000;

/** Đồng hồ nổi góc dưới bên phải khi đang có phiên Pomodoro. */
export default function PomodoroWidget() {
  const pomo = usePomodoro();
  const { openTask } = useUI();
  const [small, setSmall] = useState(false);
  const titleRef = useRef(null);
  const { state, remaining } = pomo || {};

  // Tab đang ẩn thì hiện thời gian còn lại trên tiêu đề tab
  useEffect(() => {
    if (!state?.endsAt) return undefined;
    const sync = () => {
      if (document.hidden) {
        titleRef.current ??= document.title;
        document.title = `${state.phase === 'focus' ? '⏱' : '☕'} ${formatClock(remaining)} · TaskFlow`;
      } else if (titleRef.current) {
        document.title = titleRef.current;
        titleRef.current = null;
      }
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, [state?.endsAt, state?.phase, remaining]);
  useEffect(
    () => () => {
      if (titleRef.current) document.title = titleRef.current;
    },
    [],
  );

  if (!pomo) return null;
  const focus = state?.phase === 'focus';
  const total = (focus ? state?.minutes : state?.breakMinutes || 5) * MIN;
  const progress = state ? 1 - remaining / total : 0;
  const running = !!state?.endsAt;
  const R = 20;
  const C = 2 * Math.PI * R;

  return (
    <AnimatePresence>
      {state && (
        <motion.aside
          key="pomodoro"
          aria-label={tr('Đồng hồ Pomodoro')}
          initial={{ opacity: 0, y: 24, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 360, damping: 28 }}
          className="shadow-lift fixed right-3 bottom-3 z-40 flex items-center gap-3 rounded-2xl border border-line bg-surface p-2.5 sm:right-5 sm:bottom-5"
        >
          <button
            type="button"
            onClick={() => setSmall((v) => !v)}
            className="relative grid size-12 shrink-0 place-items-center rounded-full"
            aria-label={small ? tr('Mở rộng đồng hồ') : tr('Thu gọn đồng hồ')}
            aria-expanded={!small}
          >
            <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90" aria-hidden="true">
              <circle cx="24" cy="24" r={R} fill="none" stroke="var(--surface-3)" strokeWidth="4" />
              <circle
                cx="24"
                cy="24"
                r={R}
                fill="none"
                stroke={focus ? 'var(--accent)' : 'var(--success)'}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - Math.min(1, Math.max(0, progress)))}
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            {focus ? <Timer className="size-4 text-accent-hi" aria-hidden="true" /> : <Coffee className="size-4 text-success" aria-hidden="true" />}
          </button>

          <div className="min-w-0">
            <p className="font-display text-lg leading-none font-bold tabular-nums" role="timer" aria-live="off">
              {formatClock(remaining)}
            </p>
            {!small && (
              <button
                type="button"
                onClick={() => openTask(state.taskId)}
                className="mt-1 block max-w-44 truncate text-left text-xs text-muted hover:text-ink hover:underline"
                title={state.title}
              >
                {focus ? (running ? tr('Đang tập trung') : tr('Tạm dừng')) : tr('Đang nghỉ')} · {state.title}
              </button>
            )}
          </div>

          {!small && (
            <div className="flex items-center gap-1">
              {focus || running ? (
                <button
                  type="button"
                  onClick={running ? pomo.pause : pomo.resume}
                  className="grid size-9 place-items-center rounded-xl bg-surface-2 text-ink hover:bg-surface-3"
                  aria-label={running ? tr('Tạm dừng') : tr('Tiếp tục')}
                >
                  {running ? <Pause className="size-4" /> : <Play className="size-4" />}
                </button>
              ) : null}
              {!focus && (
                <button
                  type="button"
                  onClick={pomo.skipBreak}
                  className="grid size-9 place-items-center rounded-xl bg-surface-2 text-ink hover:bg-surface-3"
                  aria-label={tr('Bỏ qua giờ nghỉ')}
                  title={tr('Bỏ qua giờ nghỉ')}
                >
                  <SkipForward className="size-4" />
                </button>
              )}
              <button
                type="button"
                onClick={pomo.stop}
                className="grid size-9 place-items-center rounded-xl text-muted hover:bg-danger/10 hover:text-danger"
                aria-label={tr('Dừng Pomodoro')}
                title={tr('Dừng Pomodoro')}
              >
                <X className="size-4" />
              </button>
            </div>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

import { Bell, BellRing, CalendarClock, TriangleAlert } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useProjects, useTasks } from '../../hooks/queries.js';
import { DAY, formatTime } from '../../lib/dates.js';
import { usePersistentState } from '../../lib/theme.js';
import { DueChip, ProjectTag } from '../ui/Pills.jsx';
import { useToast } from '../ui/Toasts.jsx';
import { useUI } from './UIContext.jsx';
import { tr } from '../../lib/i18n.js';

const SOON = DAY; // "sắp tới hạn": trong 24 giờ tới
const NOTIFY_AHEAD = 60 * 60 * 1000; // báo trước 1 giờ
const SENT_KEY = 'taskflow-notified';

const canNotify = () => typeof window !== 'undefined' && 'Notification' in window;

function readSent() {
  try {
    return JSON.parse(localStorage.getItem(SENT_KEY) || '{}');
  } catch {
    return {};
  }
}

async function showNotification(title, options) {
  try {
    // Android Chrome chỉ cho hiện thông báo qua service worker
    const reg = await navigator.serviceWorker?.getRegistration?.();
    if (reg) return reg.showNotification(title, options);
    return new Notification(title, options);
  } catch {
    return null;
  }
}

/** Việc trễ hạn và việc tới hạn trong 24 giờ tới (chỉ tính dự án đang hoạt động). */
export function useReminders() {
  const { data: projects = [] } = useProjects();
  const { data: open = [] } = useTasks({ status: 'open', sort: 'deadline' }, { refetchInterval: 5 * 60 * 1000 });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  return useMemo(() => {
    const active = new Set(projects.map((p) => p._id));
    const overdue = [];
    const soon = [];
    for (const t of open) {
      if (!t.deadline || !active.has(t.project?._id)) continue;
      const left = new Date(t.deadline) - now;
      if (left < 0) overdue.push(t);
      else if (left <= SOON) soon.push(t);
    }
    return { overdue, soon, now };
  }, [projects, open, now]);
}

export default function Reminders() {
  const { overdue, soon, now } = useReminders();
  const { openTask } = useUI();
  const notify = useToast();
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = usePersistentState('taskflow-notify', false);
  const [permission, setPermission] = useState(() => (canNotify() ? Notification.permission : 'unsupported'));
  const ref = useRef(null);
  const panelId = useId();
  const count = overdue.length + soon.length;

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Báo qua trình duyệt khi còn dưới 1 giờ (mỗi việc chỉ báo một lần cho mỗi hạn chót)
  useEffect(() => {
    if (!enabled || permission !== 'granted') return;
    const sent = readSent();
    let changed = false;
    for (const t of soon) {
      const left = new Date(t.deadline) - now;
      if (left > NOTIFY_AHEAD || sent[t._id] === t.deadline) continue;
      sent[t._id] = t.deadline;
      changed = true;
      showNotification(tr('Sắp tới hạn: {title}', { title: t.title }), {
        body: tr('Hạn lúc {time} · {project}', { time: formatTime(t.deadline), project: t.project?.name || 'TaskFlow' }),
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: `task-${t._id}`,
      });
    }
    if (changed) {
      // Giữ gọn: chỉ nhớ các việc còn đang nhắc
      const keep = Object.fromEntries(Object.entries(sent).filter(([id]) => soon.some((t) => t._id === id) || overdue.some((t) => t._id === id)));
      try {
        localStorage.setItem(SENT_KEY, JSON.stringify(keep));
      } catch {
        /* bỏ qua */
      }
    }
  }, [enabled, permission, soon, overdue, now]);

  const toggleBrowser = async () => {
    if (enabled) {
      setEnabled(false);
      notify({ message: tr('Đã tắt thông báo trên trình duyệt') });
      return;
    }
    if (!canNotify()) {
      notify({ tone: 'error', message: tr('Trình duyệt này không hỗ trợ thông báo') });
      return;
    }
    const result = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
    setPermission(result);
    if (result === 'granted') {
      setEnabled(true);
      notify({ tone: 'success', message: tr('Sẽ nhắc bạn trước hạn chót 1 giờ') });
    } else {
      notify({ tone: 'error', message: tr('Trình duyệt đang chặn thông báo. Hãy cho phép trong phần cài đặt trang web.') });
    }
  };

  const Icon = count ? BellRing : Bell;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={count ? tr('Nhắc việc: {overdue} trễ hạn, {soon} sắp tới hạn', { overdue: overdue.length, soon: soon.length }) : tr('Nhắc việc')}
        className="relative grid size-9 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink"
      >
        <motion.span
          key={count}
          initial={count ? { rotate: -18 } : false}
          animate={{ rotate: [-18, 14, -8, 4, 0] }}
          transition={{ duration: 0.7 }}
          className="grid place-items-center"
        >
          <Icon className="size-[18px]" />
        </motion.span>
        {count > 0 && (
          <span
            className={`absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] leading-none font-bold text-white tabular-nums ring-2 ring-surface ${
              overdue.length ? 'bg-danger-solid' : 'bg-warning-solid'
            }`}
            aria-hidden="true"
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            role="dialog"
            aria-label={tr('Nhắc việc')}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
            transition={{ duration: 0.18 }}
            className="shadow-lift fixed inset-x-2.5 top-[76px] z-40 origin-top rounded-2xl border border-line bg-surface sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-[360px]"
          >
            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
              <p className="font-display text-sm font-bold">{tr('Nhắc việc')}</p>
              <span className="text-xs text-muted">{count ? tr('{count} việc cần để ý', { count }) : tr('Không có gì gấp')}</span>
            </div>

            <div className="max-h-[min(60vh,420px)] overflow-y-auto p-1.5">
              {count === 0 && (
                <div className="flex flex-col items-center px-6 py-8 text-center">
                  <span className="tone-success grid size-10 place-items-center rounded-2xl">
                    <CalendarClock className="size-5" aria-hidden="true" />
                  </span>
                  <p className="mt-3 text-[13px] font-semibold">{tr('Mọi thứ đang trong tầm kiểm soát')}</p>
                  <p className="mt-1 text-xs text-muted">{tr('Không có việc nào trễ hạn hay tới hạn trong 24 giờ tới.')}</p>
                </div>
              )}
              {[
                { key: 'overdue', title: tr('Trễ hạn'), list: overdue, icon: TriangleAlert, color: 'text-danger' },
                { key: 'soon', title: tr('Trong 24 giờ tới'), list: soon, icon: CalendarClock, color: 'text-warning' },
              ]
                .filter((g) => g.list.length)
                .map((g) => (
                  <section key={g.key} className="mb-1">
                    <h3 className={`flex items-center gap-1.5 px-2.5 pt-2 pb-1 text-xs font-semibold ${g.color}`}>
                      <g.icon className="size-3.5" aria-hidden="true" /> {g.title} · {g.list.length}
                    </h3>
                    <ul>
                      {g.list.slice(0, 8).map((t) => (
                        <li key={t._id}>
                          <button
                            type="button"
                            onClick={() => {
                              setOpen(false);
                              openTask(t._id);
                            }}
                            className="flex w-full items-start gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-surface-2"
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-medium">{t.title}</span>
                              <ProjectTag project={t.project} className="mt-0.5 max-w-48" />
                            </span>
                            <DueChip task={t} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
              <Link to="/my-tasks#overdue" onClick={() => setOpen(false)} className="text-xs font-semibold text-accent-hi hover:underline">
                {tr('Xem Việc của tôi')}
              </Link>
              {permission !== 'unsupported' && (
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled && permission === 'granted'}
                  onClick={toggleBrowser}
                  className="flex items-center gap-2 text-xs font-medium text-muted hover:text-ink"
                >
                  {tr('Báo trước 1 giờ')}
                  <span className={`relative h-5 w-9 rounded-full transition-colors ${enabled && permission === 'granted' ? 'bg-accent' : 'bg-surface-3'}`}>
                    <motion.span
                      className="absolute top-0.5 size-4 rounded-full bg-white shadow"
                      animate={{ left: enabled && permission === 'granted' ? 18 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                    />
                  </span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { LayoutGroup, motion, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import LiquidCheck from '../ui/LiquidCheck.jsx';
import { CountUp } from '../ui/Motion.jsx';
import { tr } from '../../lib/i18n.js';

// Dữ liệu minh hoạ, không gọi API
const SEED = [
  { id: 'a', title: tr('Viết chương 3: Thiết kế'), tag: tr('Khẩn cấp'), tone: 'danger', due: tr('Hôm nay'), status: 'doing', at: 1 },
  { id: 'b', title: tr('Vẽ sơ đồ cơ sở dữ liệu'), tag: tr('Cao'), tone: 'warning', due: tr('Mai'), status: 'doing', at: 2 },
  { id: 'c', title: tr('Gửi bản nháp cho thầy'), tag: tr('Vừa'), tone: 'accent', due: tr('Thứ 6'), status: 'todo', at: 3 },
  { id: 'd', title: tr('Làm slide bảo vệ'), tag: tr('Cao'), tone: 'warning', due: tr('28/11'), status: 'todo', at: 4 },
  { id: 'e', title: tr('Khảo sát người dùng'), tag: tr('Thấp'), tone: 'muted', due: null, status: 'done', at: 2 },
  { id: 'f', title: tr('Chốt đề tài với thầy'), tag: tr('Vừa'), tone: 'accent', due: null, status: 'done', at: 1 },
];

const COLUMNS = [
  { key: 'todo', label: tr('Cần làm'), dot: 'var(--faint)', className: 'hidden sm:block' },
  { key: 'doing', label: tr('Đang làm'), dot: 'var(--warning)', className: '' },
  { key: 'done', label: tr('Đã xong'), dot: 'var(--success)', className: '' },
];

const WAVE = `M0 10 Q 25 2 50 10 ${Array.from({ length: 15 }, (_, i) => `T ${100 + i * 50} 10`).join(' ')} V 40 H 0 Z`;

function DemoCard({ task, checking }) {
  const done = task.status === 'done';
  return (
    <motion.div
      layout
      layoutId={task.id}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      className="rounded-xl border border-line bg-surface p-2.5 shadow-[0_6px_16px_-12px_rgb(0_0_0/0.5)]"
    >
      <div className="flex items-start gap-2">
        <LiquidCheck checked={done || checking} size={18} color={done || checking ? 'var(--success)' : 'var(--line-strong)'} label={task.title} />
        <p className={`min-w-0 text-[12px] leading-snug font-medium transition-colors ${done ? 'text-faint line-through' : 'text-ink'}`}>{task.title}</p>
      </div>
      {!done && (
        <div className="mt-2 flex flex-wrap gap-1 pl-6">
          <span className={`rounded-full px-1.5 py-px text-[10px] font-semibold tone-${task.tone}`}>{task.tag}</span>
          {task.due && <span className="rounded-full bg-surface-2 px-1.5 py-px text-[10px] font-medium text-muted">{task.due}</span>}
        </div>
      )}
    </motion.div>
  );
}

/**
 * Bảng Kanban thu nhỏ tự chạy: cứ vài giây một việc được tick xong, trượt sang cột Đã xong
 * và mực nước trong khung dâng lên. Chỉ để minh hoạ, không bấm được.
 */
export default function HeroDemo() {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { amount: 0.3 });
  const [tasks, setTasks] = useState(SEED);
  const [checking, setChecking] = useState(null);

  useEffect(() => {
    if (reduce || !inView) return undefined;
    const doing = tasks.filter((t) => t.status === 'doing').sort((a, b) => a.at - b.at)[0];
    if (!doing) {
      const t = setTimeout(() => setTasks(SEED), 2800);
      return () => clearTimeout(t);
    }
    const t1 = setTimeout(() => setChecking(doing.id), 1400);
    const t2 = setTimeout(() => {
      setChecking(null);
      setTasks((list) => {
        const stamp = Date.now();
        const next = list.map((t) => (t.id === doing.id ? { ...t, status: 'done', at: stamp } : t));
        const todo = next.filter((t) => t.status === 'todo').sort((a, b) => a.at - b.at)[0];
        return todo ? next.map((t) => (t.id === todo.id ? { ...t, status: 'doing', at: stamp } : t)) : next;
      });
    }, 2300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [tasks, reduce, inView]);

  const done = tasks.filter((t) => t.status === 'done').length;
  const progress = Math.round((done / tasks.length) * 100);

  return (
    <div ref={ref} aria-hidden="true" inert className="relative">
      <div className="absolute -inset-6 -z-10 rounded-[40px] bg-accent/20 blur-3xl" />
      <div className="relative overflow-hidden rounded-[24px] border border-line bg-surface-2/80 shadow-[0_40px_80px_-40px_rgb(0_0_0/0.7)] backdrop-blur-xl">
        {/* Thanh tiêu đề giả lập cửa sổ */}
        <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-[#ff5f57]" />
            <span className="size-2.5 rounded-full bg-[#febc2e]" />
            <span className="size-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-accent/15 font-display text-[10px] font-bold text-accent-hi">{tr('Đ')}</span>
            <span className="truncate text-[13px] font-semibold">{tr('Đồ án tốt nghiệp')}</span>
          </div>
          <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-semibold text-accent-hi">
            <CountUp value={progress} suffix="%" duration={0.8} /> {tr('xong')}
          </span>
        </div>

        <div className="relative p-3 sm:p-4">
          {/* Mực nước dâng theo số việc đã xong */}
          <motion.div
            className="pointer-events-none absolute inset-x-0 bottom-0"
            initial={false}
            animate={{ height: `${10 + progress * 0.42}%` }}
            transition={{ type: 'spring', stiffness: 60, damping: 16 }}
          >
            <svg className="absolute bottom-full h-3 w-[200%]" viewBox="0 0 800 40" preserveAspectRatio="none">
              <path className="wave-drift" d={WAVE} fill="var(--accent)" opacity="0.16" />
            </svg>
            <div className="h-full bg-accent/16" />
          </motion.div>

          <LayoutGroup>
            <div className="relative grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
              {COLUMNS.map((col) => {
                const items = tasks
                  .filter((t) => t.status === col.key)
                  .sort((a, b) => (col.key === 'done' ? b.at - a.at : a.at - b.at))
                  .slice(0, col.key === 'done' ? 3 : 4);
                const count = tasks.filter((t) => t.status === col.key).length;
                return (
                  <div key={col.key} className={`min-h-[248px] ${col.className}`}>
                    <div className="mb-2 flex items-center gap-1.5 px-1">
                      <span className="size-2 rounded-full" style={{ background: col.dot }} />
                      <span className="text-[11px] font-semibold text-muted">{col.label}</span>
                      <span className="ml-auto rounded-md bg-surface px-1.5 text-[10px] font-semibold text-faint tabular-nums">{count}</span>
                    </div>
                    <div className="space-y-2">
                      {items.map((t) => (
                        <DemoCard key={t.id} task={t} checking={checking === t.id} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </LayoutGroup>
        </div>
      </div>
    </div>
  );
}

import { FolderPlus, ListPlus, MoveRight } from 'lucide-react';
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import { useRef, useState } from 'react';
import LiquidCheck from '../ui/LiquidCheck.jsx';
import { tr } from '../../lib/i18n.js';

const STEPS = [
  {
    icon: FolderPlus,
    title: tr('Tạo một dự án'),
    body: tr('Đặt tên và chọn màu cho dự án, ví dụ "Đồ án tốt nghiệp", "Luyện thi IELTS" hay "Việc nhà". Mỗi dự án là một bể nước riêng.'),
  },
  {
    icon: ListPlus,
    title: tr('Thêm việc và hạn chót'),
    body: tr('Gõ nhanh ngay trong cột, nhấn Enter để thêm liên tục. Đặt mức ưu tiên, hạn chót và chia nhỏ bằng checklist.'),
  },
  {
    icon: MoveRight,
    title: tr('Kéo sang Đã xong'),
    body: tr('Tick một cái hoặc kéo thẻ sang cột Đã xong, nước trong bể dâng lên một chút. Nhìn bể đầy dần là thấy mình đã đi được bao xa.'),
  },
];

const THRESHOLDS = [0.12, 0.45, 0.78];
const WAVE = `M0 12 Q 30 2 60 12 ${Array.from({ length: 15 }, (_, i) => `T ${120 + i * 60} 12`).join(' ')} V 48 H 0 Z`;
const BUBBLES = [
  { left: '18%', size: 6, dur: '7s', delay: '0s' },
  { left: '34%', size: 4, dur: '5.5s', delay: '1.8s' },
  { left: '52%', size: 8, dur: '8s', delay: '0.6s' },
  { left: '68%', size: 5, dur: '6.2s', delay: '2.6s' },
  { left: '82%', size: 4, dur: '5s', delay: '1.1s' },
];

/** Bể nước lớn: mực nước chạy theo thanh cuộn, đi qua từng bước thì bước đó được tick. */
export default function TideSteps() {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.7', 'end 0.65'] });
  const level = useSpring(useTransform(scrollYProgress, [0, 1], [6, 100]), { stiffness: 90, damping: 22 });
  const height = useTransform(level, (v) => `${reduce ? 100 : v}%`);
  const label = useTransform(level, (v) => `${Math.round(reduce ? 100 : v)}%`);
  const clip = useTransform(level, (v) => `inset(${100 - (reduce ? 100 : v)}% 0 0 0)`);
  const [reached, setReached] = useState(reduce ? 3 : 0);

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    if (reduce) return;
    setReached(THRESHOLDS.filter((t) => v >= t).length);
  });

  return (
    <div ref={ref} className="grid gap-8 lg:grid-cols-[minmax(0,400px)_1fr] lg:gap-16">
      {/* Bể nước: dính trên đầu khi cuộn (điện thoại là thanh ngang, máy tính là bể đứng) */}
      <div className="sticky top-[76px] z-10 self-start lg:top-28">
        <div className="relative h-28 overflow-hidden rounded-[24px] border border-line bg-surface shadow-[0_24px_60px_-36px_rgb(0_0_0/0.6)] lg:h-[440px] lg:rounded-[32px]">
          <motion.div className="absolute inset-x-0 bottom-0" style={{ height }}>
            <svg className="absolute bottom-[calc(100%-1px)] h-4 w-[200%]" viewBox="0 0 960 48" preserveAspectRatio="none" aria-hidden="true">
              <path className="wave-drift-slow" d={WAVE} fill="var(--accent)" opacity="0.45" />
            </svg>
            <svg className="absolute bottom-[calc(100%-1px)] h-3 w-[200%]" viewBox="0 0 960 48" preserveAspectRatio="none" aria-hidden="true">
              <path className="wave-drift" d={WAVE} fill="#2f6bff" />
            </svg>
            <div className="relative h-full overflow-hidden bg-[linear-gradient(180deg,#2f6bff_0%,#1638b8_100%)]">
              {BUBBLES.map((b) => (
                <span
                  key={b.left}
                  className="bubble absolute bottom-0 rounded-full bg-white/50"
                  style={{ left: b.left, width: b.size, height: b.size, '--dur': b.dur, '--delay': b.delay }}
                />
              ))}
            </div>
          </motion.div>

          {/* Vạch đo */}
          <div className="pointer-events-none absolute inset-y-6 right-4 z-10 hidden flex-col justify-between text-right text-[10px] font-semibold text-ink/45 lg:flex">
            {['100', '75', '50', '25', '0'].map((n) => (
              <span key={n} className="flex items-center justify-end gap-1.5">
                {n}
                <span className="h-px w-3 bg-ink/25" />
              </span>
            ))}
          </div>

          {/* Hai lớp chữ: màu chữ thường ở trên nền, chữ trắng chỉ hiện phần nằm trong nước */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <motion.span className="font-display text-4xl font-bold tabular-nums lg:text-6xl">{label}</motion.span>
            <span className="mt-1 text-xs font-medium text-muted lg:mt-2 lg:text-sm">{tr('bể đã đầy')}</span>
          </div>
          <motion.div
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center text-white"
            style={{ clipPath: clip }}
          >
            <motion.span className="font-display text-4xl font-bold tabular-nums lg:text-6xl">{label}</motion.span>
            <span className="mt-1 text-xs font-medium text-white/80 lg:mt-2 lg:text-sm">{tr('bể đã đầy')}</span>
          </motion.div>
        </div>
      </div>

      <ol className="relative">
        {STEPS.map((s, i) => {
          const done = reached > i;
          const Icon = s.icon;
          return (
            <li key={s.title} className="relative flex gap-4 pb-12 last:pb-0 sm:gap-5 lg:min-h-[40vh] lg:pb-0 lg:last:min-h-[30vh]">
              {i < STEPS.length - 1 && (
                <span className="absolute top-11 bottom-1 left-[19px] w-0.5 overflow-hidden rounded-full bg-line lg:bottom-4">
                  <motion.span
                    className="block w-full origin-top bg-accent"
                    initial={false}
                    animate={{ scaleY: reached > i + 1 ? 1 : 0 }}
                    transition={{ duration: 0.6 }}
                    style={{ height: '100%' }}
                  />
                </span>
              )}
              <div className="relative grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface" aria-hidden="true" inert>
                <LiquidCheck checked={done} size={24} color={done ? 'var(--accent)' : 'var(--line-strong)'} label={s.title} />
              </div>
              <motion.div initial={false} animate={{ opacity: done ? 1 : 0.8, x: done ? 0 : 6 }} transition={{ duration: 0.45 }} className="min-w-0 pt-1">
                <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-accent-hi uppercase">
                  <Icon className="size-4" aria-hidden="true" /> {tr('Bước')} {i + 1}
                </p>
                <h3 className="mt-2 font-display text-xl font-bold tracking-tight sm:text-2xl">{s.title}</h3>
                <p className="mt-2 max-w-md text-[15px] leading-relaxed text-muted">{s.body}</p>
              </motion.div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

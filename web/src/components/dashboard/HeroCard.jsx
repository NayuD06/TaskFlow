import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { CalendarCheck, TriangleAlert } from 'lucide-react';
import { useEffect, useId } from 'react';
import { Link } from 'react-router';
import { formatLongDate, greeting } from '../../lib/dates.js';
import { Card } from '../ui/Motion.jsx';

const R = 62; // bán kính quả cầu nước
const SIZE = 150;

function wave(amp, length, width) {
  let d = `M0 0 Q ${length / 4} ${-amp} ${length / 2} 0`;
  for (let x = length; x <= width; x += length / 2) d += ` T ${x} 0`;
  return `${d} V ${SIZE} H 0 Z`;
}

/** Quả cầu nước: mực nước = % việc trong tuần đã xong. */
function FlowOrb({ value = 0, done = 0, total = 0 }) {
  const id = useId().replace(/:/g, '');
  const reduce = useReducedMotion();
  const level = useMotionValue(0);
  const y = useTransform(level, (v) => SIZE / 2 + R - (v / 100) * (2 * R) - 2);
  const label = useTransform(level, (v) => `${Math.round(v)}%`);

  useEffect(() => {
    const c = animate(level, value, reduce ? { duration: 0 } : { duration: 1.6, ease: [0.16, 0.84, 0.24, 1], delay: 0.35 });
    return () => c.stop();
  }, [value, level, reduce]);

  return (
    <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`Tuần này đã xong ${value}%`}>
        <defs>
          <clipPath id={`orb-${id}`}>
            <circle cx={SIZE / 2} cy={SIZE / 2} r={R} />
          </clipPath>
          <linearGradient id={`orb-water-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#4f86ff" />
            <stop offset="1" stopColor="#1638b8" />
          </linearGradient>
        </defs>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R + 7} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="1.5" />
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="rgb(255 255 255 / 0.05)" />
        <g clipPath={`url(#orb-${id})`}>
          <motion.g style={{ y }}>
            <path className="wave-drift-slow" d={wave(6, 60, SIZE * 2)} fill="#8fb0ff" opacity="0.35" />
            <path className="wave-drift" d={wave(5, 50, SIZE * 2)} fill={`url(#orb-water-${id})`} />
          </motion.g>
        </g>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="rgb(255 255 255 / 0.18)" strokeWidth="1.5" />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-white">
        <motion.span className="font-display text-[28px] leading-none font-bold tabular-nums drop-shadow-[0_2px_8px_rgb(0_0_0/0.4)]">{label}</motion.span>
        <span className="mt-1.5 text-[11px] font-medium text-white/75">
          {done}/{total} việc tuần này
        </span>
      </div>
    </div>
  );
}

function summary(stats) {
  if (!stats) return 'Đang tải số liệu…';
  const parts = [];
  if (stats.dueToday) parts.push(`${stats.dueToday} việc đến hạn hôm nay`);
  if (stats.overdue) parts.push(`${stats.overdue} việc đang trễ hạn`);
  if (!parts.length) return stats.open ? `Bạn còn ${stats.open} việc đang mở, không có gì gấp hôm nay.` : 'Không còn việc nào đang mở. Tận hưởng nhé!';
  return `Hôm nay có ${parts.join(' và ')}.`;
}

export default function HeroCard({ data }) {
  const now = new Date();
  return (
    <Card className="relative overflow-hidden !border-white/[0.06] !bg-hero p-6 text-white sm:p-7 lg:col-span-2">
      {/* Sóng trang trí chạy chậm ở đáy thẻ */}
      <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full" viewBox="0 0 800 96" preserveAspectRatio="none" aria-hidden="true">
        <path
          className="wave-drift-slow"
          d="M0 50 Q50 30 100 50 T200 50 T300 50 T400 50 T500 50 T600 50 T700 50 T800 50 T900 50 T1000 50 T1100 50 T1200 50 T1300 50 T1400 50 T1500 50 T1600 50 V96 H0 Z"
          fill="rgb(47 107 255 / 0.10)"
        />
        <path
          className="wave-drift"
          d="M0 66 Q40 52 80 66 T160 66 T240 66 T320 66 T400 66 T480 66 T560 66 T640 66 T720 66 T800 66 T880 66 T960 66 T1040 66 T1120 66 T1200 66 T1280 66 T1360 66 T1440 66 T1520 66 T1600 66 V96 H0 Z"
          fill="rgb(47 107 255 / 0.16)"
        />
      </svg>

      <div className="relative flex flex-col-reverse gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[13px] text-white/60">{formatLongDate(now)}</p>
          <h1 className="mt-1.5 font-display text-[26px] leading-tight font-bold sm:text-[30px]">{greeting(now)}</h1>
          <p className="mt-2 max-w-md text-[14px] leading-relaxed text-white/75">{summary(data?.stats)}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              to="/my-tasks"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[13px] font-semibold text-[#06143a] hover:bg-white/90"
            >
              <CalendarCheck className="size-4" aria-hidden="true" />
              Lên kế hoạch hôm nay
            </Link>
            {data?.stats.overdue > 0 && (
              <Link
                to="/my-tasks#overdue"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/10 px-4 text-[13px] font-semibold text-white hover:bg-white/15"
              >
                <TriangleAlert className="size-4 text-[#ff8da0]" aria-hidden="true" />
                Xem việc trễ hạn
              </Link>
            )}
          </div>
        </div>
        <FlowOrb value={data?.week.progress ?? 0} done={data?.week.done ?? 0} total={data?.week.total ?? 0} />
      </div>
    </Card>
  );
}

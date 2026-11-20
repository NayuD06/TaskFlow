import { motion } from 'motion/react';
import { useId, useMemo, useState } from 'react';
import { WEEKDAYS, shortDate } from '../../lib/dates.js';
import { Card } from '../ui/Motion.jsx';
import Segmented from '../ui/Segmented.jsx';
import { tr } from '../../lib/i18n.js';

const W = 640;
const H = 200;
const PAD = { l: 28, r: 24, t: 16, b: 28 };

/** Biểu đồ đường: số việc hoàn thành mỗi ngày, so với kỳ trước (nét đứt). */
export default function Throughput({ daily = [] }) {
  const id = useId().replace(/:/g, '');
  const [range, setRange] = useState(14);
  const [hover, setHover] = useState(null);

  const { current, previous, days, max } = useMemo(() => {
    const cur = daily.slice(-range);
    const prev = daily.slice(-range * 2, -range);
    const today = new Date();
    const ds = cur.map((_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (cur.length - 1 - i));
      return d;
    });
    return { current: cur, previous: prev, days: ds, max: Math.max(2, ...cur, ...prev) };
  }, [daily, range]);

  const sum = (arr) => arr.reduce((a, b) => a + b, 0);
  const total = sum(current);
  const prevTotal = sum(previous);
  const change = prevTotal ? Math.round(((total - prevTotal) / prevTotal) * 100) : null;

  const x = (i) => PAD.l + (i / Math.max(current.length - 1, 1)) * (W - PAD.l - PAD.r);
  const y = (v) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
  const path = (arr) => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const linePath = path(current);
  const areaPath = `${linePath} L${x(current.length - 1)} ${H - PAD.b} L${x(0)} ${H - PAD.b} Z`;
  const ticks = [0, Math.round(max / 2), max];

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (current.length - 1));
    setHover(i >= 0 && i < current.length ? i : null);
  };

  return (
    <Card className="p-5 lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[15px] font-bold">{tr('Nhịp hoàn thành')}</h2>
          <p className="mt-1 text-[13px] text-muted">
            <span className="font-semibold text-ink">{tr('{n} việc', { n: total })}</span> {tr('trong {n} ngày', { n: range })}
            {change !== null && (
              <span className={`ml-2 rounded-md px-1.5 py-0.5 text-xs font-semibold ${change >= 0 ? 'tone-success' : 'tone-danger'}`}>
                {tr('{change}% so với kỳ trước', { change: `${change >= 0 ? '+' : ''}${change}` })}
              </span>
            )}
          </p>
        </div>
        <Segmented
          size="sm"
          label={tr('Khoảng thời gian')}
          value={range}
          onChange={setRange}
          options={[
            { value: 7, label: tr('7 ngày') },
            { value: 14, label: tr('14 ngày') },
          ]}
        />
      </div>

      <div className="relative mt-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full touch-none"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          role="img"
          aria-label={tr('Biểu đồ số việc hoàn thành mỗi ngày trong {range} ngày, tổng {total}', { range, total })}
        >
          <defs>
            <linearGradient id={`tp-${id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--accent)" stopOpacity="0.35" />
              <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeDasharray={t ? '3 5' : undefined} />
              <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--faint)">
                {t}
              </text>
            </g>
          ))}

          {days.map((d, i) =>
            range === 7 || i % 2 === (current.length - 1) % 2 ? (
              <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill={i === current.length - 1 ? 'var(--ink)' : 'var(--faint)'}>
                {range === 7 ? WEEKDAYS[(d.getDay() + 6) % 7] : shortDate(d)}
              </text>
            ) : null,
          )}

          {current.length > 1 && previous.length === current.length && (
            <motion.path
              key={`prev-${range}`}
              d={path(previous)}
              fill="none"
              stroke="var(--faint)"
              strokeWidth="1.5"
              strokeDasharray="4 5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            />
          )}
          {current.length > 1 && (
            <>
              <motion.path
                key={`area-${range}`}
                d={areaPath}
                fill={`url(#tp-${id})`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
              />
              <motion.path
                key={`line-${range}`}
                d={linePath}
                fill="none"
                stroke="var(--accent-hi)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.6, ease: [0.16, 0.84, 0.24, 1] }}
              />
            </>
          )}

          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="var(--line-strong)" />
              <circle cx={x(hover)} cy={y(current[hover])} r="5" fill="var(--surface)" stroke="var(--accent-hi)" strokeWidth="2.5" />
            </g>
          )}
        </svg>

        {hover !== null && (
          <div
            className="shadow-lift pointer-events-none absolute top-0 rounded-xl border border-line bg-surface px-3 py-2 text-xs"
            style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > current.length / 2 ? '-110%' : '10%'})` }}
          >
            <p className="font-semibold">
              {WEEKDAYS[(days[hover].getDay() + 6) % 7]}, {shortDate(days[hover])}
            </p>
            <p className="mt-0.5 text-muted">
              <span className="font-semibold text-accent-hi">{current[hover]}</span> {tr('việc xong', { n: current[hover] })}
              {previous[hover] !== undefined && (
                <span>
                  {' '}
                  {tr('· kỳ trước')} {previous[hover]}
                </span>
              )}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

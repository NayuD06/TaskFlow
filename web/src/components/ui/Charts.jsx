import { motion } from 'motion/react';
import { useId } from 'react';

/** Đường sparkline 7 điểm, tự vẽ ra khi xuất hiện. */
export function Sparkline({ data = [], color = 'var(--accent)', width = 96, height = 32 }) {
  const id = useId().replace(/:/g, '');
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const pts = data.map((v, i) => [(i / Math.max(data.length - 1, 1)) * width, height - 3 - ((v - min) / span) * (height - 6)]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${width} ${height} L0 ${height} Z`;
  const [lx, ly] = pts[pts.length - 1];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="overflow-visible">
      <defs>
        <linearGradient id={`sp-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path d={area} fill={`url(#sp-${id})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.6 }} />
      <motion.path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: [0.16, 0.84, 0.24, 1], delay: 0.2 }}
      />
      <motion.circle
        cx={lx}
        cy={ly}
        r="3"
        fill={color}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1.1, type: 'spring', stiffness: 400, damping: 15 }}
      />
    </svg>
  );
}

/** Thanh tiến độ có hiệu ứng đổ đầy. */
export function ProgressBar({ value = 0, color = 'var(--accent)', className = 'h-1.5', track = 'bg-surface-3' }) {
  return (
    <div className={`overflow-hidden rounded-full ${track} ${className}`}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: 1, ease: [0.16, 0.84, 0.24, 1] }}
      />
    </div>
  );
}

/** Vòng tiến độ nhỏ. */
export function ProgressRing({ value = 0, size = 40, stroke = 4, color = 'var(--accent)', children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - Math.max(0, Math.min(100, value)) / 100) }}
          transition={{ duration: 1, ease: [0.16, 0.84, 0.24, 1] }}
        />
      </svg>
      <span className="absolute text-[10px] font-bold tabular-nums">{children ?? `${value}%`}</span>
    </div>
  );
}

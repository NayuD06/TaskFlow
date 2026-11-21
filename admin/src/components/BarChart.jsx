import { useId, useState } from 'react';

const W = 560;
const H = 168;
const PAD = { top: 14, right: 8, bottom: 26, left: 30 };

function niceMax(v) {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * pow >= v / 4) * pow;
  return Math.ceil(v / step) * step;
}

/**
 * Biểu đồ cột một dãy số theo ngày (14 ngày gần nhất).
 * Một chỉ số mỗi biểu đồ, một trục; rê chuột để xem số từng ngày; trình đọc màn hình đọc bảng ẩn bên dưới.
 */
export default function BarChart({ title, days, field, unit, color = 'var(--accent)' }) {
  const id = useId();
  const [active, setActive] = useState(null);
  const values = days.map((d) => d[field]);
  const total = values.reduce((s, v) => s + v, 0);
  const max = niceMax(Math.max(...values, 1));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / days.length;
  const barW = Math.max(6, slot - 6);
  const y = (v) => PAD.top + innerH - (v / max) * innerH;
  const ticks = [0, max / 2, max];
  const label = (d) => new Date(d.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  const weekday = (d) => new Date(d.date).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' });
  const shown = active ?? days.length - 1;

  return (
    <figure className="min-w-0">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span id={`${id}-t`} className="text-[13px] font-semibold">
          {title}
        </span>
        <span className="text-[12px] text-muted">
          14 ngày: <b className="text-ink">{total}</b> {unit}
        </span>
      </figcaption>
      <p className="mt-0.5 h-5 text-[12px] text-muted" aria-hidden="true">
        {weekday(days[shown])}: <b className="text-ink">{values[shown]}</b> {unit}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full overflow-visible" aria-hidden="true" onMouseLeave={() => setActive(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth="1" strokeDasharray={t === 0 ? undefined : '3 4'} />
            <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--faint)">
              {Number.isInteger(t) ? t : t.toFixed(1)}
            </text>
          </g>
        ))}
        {days.map((d, i) => {
          const v = values[i];
          const x = PAD.left + i * slot + (slot - barW) / 2;
          const h = Math.max(v > 0 ? 3 : 0, y(0) - y(v));
          const r = Math.min(4, barW / 2, h);
          const on = active === i;
          return (
            <g key={d.date}>
              {/* Vùng bắt chuột rộng hơn cột */}
              <rect
                x={PAD.left + i * slot}
                y={PAD.top}
                width={slot}
                height={innerH}
                fill={on ? 'var(--surface-3)' : 'transparent'}
                opacity={on ? 0.6 : 1}
                rx="6"
                onMouseEnter={() => setActive(i)}
              />
              {h > 0 && (
                <path
                  d={`M${x},${y(0)} v${-(h - r)} q0,${-r} ${r},${-r} h${barW - 2 * r} q${r},0 ${r},${r} v${h - r} z`}
                  fill={color}
                  opacity={active === null || on ? 1 : 0.45}
                  pointerEvents="none"
                />
              )}
              {(i % 2 === 1 || days.length <= 7) && (
                <text x={PAD.left + i * slot + slot / 2} y={H - 8} textAnchor="middle" fontSize="10.5" fill="var(--faint)" pointerEvents="none">
                  {label(d)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Ngày</th>
            <th scope="col">{unit}</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d, i) => (
            <tr key={d.date}>
              <td>{label(d)}</td>
              <td>{values[i]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

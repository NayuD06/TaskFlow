import { motion, useReducedMotion } from 'motion/react';

const W = 400;

function wave(amp, length, base, height) {
  let d = `M0 ${base} Q ${length / 4} ${base - amp} ${length / 2} ${base}`;
  for (let x = length; x <= W * 2; x += length / 2) d += ` T ${x} ${base}`;
  return `${d} V ${height} H 0 Z`;
}

/**
 * Ảnh bìa dự án: mực nước dâng theo % tiến độ, sóng trôi theo màu dự án.
 * Dùng ở thẻ dự án và đầu trang dự án.
 */
export default function WaterCover({ progress = 0, height = 80, className = '' }) {
  const reduce = useReducedMotion();
  // Luôn chừa một lớp nước mỏng để thẻ trống vẫn có sóng
  const level = 10 + (Math.min(progress, 100) / 100) * (height - 24);

  return (
    <div className={`hue-tint-soft relative overflow-hidden ${className}`} style={{ height }} aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="absolute inset-0 size-full">
        <motion.g
          initial={{ y: height }}
          animate={{ y: height - level }}
          transition={reduce ? { duration: 0 } : { duration: 1.4, ease: [0.16, 0.84, 0.24, 1], delay: 0.2 }}
        >
          <path className="wave-drift-slow" d={wave(5, 100, 0, height)} style={{ fill: 'color-mix(in oklab, var(--hue) 28%, transparent)' }} />
          <path className="wave-drift" d={wave(4, 80, 3, height)} style={{ fill: 'color-mix(in oklab, var(--hue) 55%, transparent)' }} />
        </motion.g>
      </svg>
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_100%_0%,color-mix(in_oklab,var(--hue)_22%,transparent),transparent_60%)]" />
    </div>
  );
}

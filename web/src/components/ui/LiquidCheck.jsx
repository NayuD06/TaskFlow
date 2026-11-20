import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useRef, useState } from 'react';

const DROPS = Array.from({ length: 7 }, (_, i) => {
  const angle = (i / 7) * Math.PI * 2 - Math.PI / 2;
  return { x: Math.cos(angle) * 20, y: Math.sin(angle) * 20, s: i % 2 ? 3 : 5 };
});

/**
 * Ô đánh dấu xong đặc trưng của TaskFlow: nước dâng đầy vòng tròn,
 * dấu tick tự vẽ, rồi bắn ra vài giọt nước.
 */
export default function LiquidCheck({ checked, color = 'var(--accent)', onToggle, label, size = 22 }) {
  const id = useId().replace(/:/g, '');
  const [burst, setBurst] = useState(0);
  const prev = useRef(checked);

  useEffect(() => {
    if (checked && !prev.current) setBurst((n) => n + 1);
    prev.current = checked;
  }, [checked]);

  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onToggle?.();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      whileTap={{ scale: 0.8 }}
      className="relative -m-2 grid shrink-0 place-items-center rounded-full p-2"
    >
      <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
        <defs>
          <clipPath id={`lc-${id}`}>
            <circle cx="15" cy="15" r="12" />
          </clipPath>
        </defs>
        <circle cx="15" cy="15" r="13" fill="var(--surface)" stroke={color} strokeWidth="2.6" />
        <g clipPath={`url(#lc-${id})`}>
          <motion.path
            d="M-6 0 Q 0 -3 6 0 T 18 0 T 30 0 T 42 0 V 34 H -6 Z"
            fill={color}
            initial={false}
            animate={{ y: checked ? -2 : 32, x: checked ? -12 : 0 }}
            transition={{ y: { type: 'spring', stiffness: 170, damping: 18 }, x: { duration: 0.7, ease: 'easeOut' } }}
          />
        </g>
        <motion.path
          d="M9.5 15.5 L13.5 19.5 L21 11"
          fill="none"
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{ duration: 0.28, delay: checked ? 0.16 : 0 }}
        />
      </svg>

      <AnimatePresence>
        {burst > 0 && (
          <motion.span
            key={burst}
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.2, delay: 0.55 }}
            aria-hidden="true"
          >
            {DROPS.map((d, i) => (
              <motion.span
                key={i}
                className="absolute top-1/2 left-1/2 rounded-full"
                style={{ width: d.s, height: d.s, marginLeft: -d.s / 2, marginTop: -d.s / 2, background: color }}
                initial={{ x: 0, y: 0, scale: 0.4 }}
                animate={{ x: d.x, y: d.y, scale: [0.4, 1.1, 0] }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              />
            ))}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

import { motion } from 'motion/react';

/** Biểu tượng TaskFlow: ô vuông có sóng nước và dấu tick. */
export function LogoMark({ size = 32 }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      initial={{ rotate: -20, scale: 0.6, opacity: 0 }}
      animate={{ rotate: 0, scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 14 }}
      className="shrink-0"
    >
      <defs>
        <clipPath id="logo-clip">
          <rect x="4" y="4" width="56" height="56" rx="18" />
        </clipPath>
        <linearGradient id="logo-water" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#5a8cff" />
          <stop offset="1" stopColor="#1f4fe0" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="18" fill="#0d1526" stroke="#2f6bff" strokeWidth="3" />
      <g clipPath="url(#logo-clip)">
        <motion.g initial={{ y: 26 }} animate={{ y: 0 }} transition={{ delay: 0.3, type: 'spring', stiffness: 60, damping: 12 }}>
          <path className="wave-drift" d="M0 36 Q8 30 16 36 T32 36 T48 36 T64 36 T80 36 T96 36 T112 36 T128 36 V64 H0 Z" fill="url(#logo-water)" />
        </motion.g>
      </g>
      <path d="M21 33 l7 7 l15 -16" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </motion.svg>
  );
}

export function LogoWord({ className = '' }) {
  return (
    <span className={`flex font-display text-[17px] font-bold tracking-tight text-white ${className}`} aria-hidden="true">
      {'TaskFlow'.split('').map((ch, i) => (
        <motion.span
          key={i}
          className="inline-block"
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: [14, -4, 0], opacity: [0, 1, 1] }}
          transition={{ delay: 0.15 + i * 0.05, duration: 0.7, ease: [0.22, 1, 0.36, 1], times: [0, 0.55, 1] }}
        >
          {ch}
        </motion.span>
      ))}
    </span>
  );
}

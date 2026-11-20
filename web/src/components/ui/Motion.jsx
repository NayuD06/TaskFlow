import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { useEffect, useRef } from 'react';

export const EASE_RISE = [0.16, 0.84, 0.24, 1];

/** Container + item cho hiệu ứng "trồi lên" lần lượt khi trang tải. */
export const riseContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.065, delayChildren: 0.05 } },
};

export const riseItem = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_RISE } },
};

export function RisePage({ children, className = '' }) {
  return (
    <motion.div variants={riseContainer} initial="hidden" animate="show" className={className}>
      {children}
    </motion.div>
  );
}

/** Thẻ nổi trên nền canvas. */
export function Card({ children, className = '', as = 'section', ...rest }) {
  const Comp = motion[as];
  return (
    <Comp variants={riseItem} className={`rounded-[20px] border border-line bg-surface ${className}`} {...rest}>
      {children}
    </Comp>
  );
}

/** Số đếm lên từ 0 khi xuất hiện, và chạy mượt khi giá trị đổi. */
export function CountUp({ value = 0, duration = 1.2, className = '', suffix = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => `${Math.round(v)}${suffix}`);

  useEffect(() => {
    if (!inView) return undefined;
    if (reduce) {
      mv.set(value);
      return undefined;
    }
    const controls = animate(mv, value, { duration, ease: 'easeOut' });
    return () => controls.stop();
  }, [value, inView, reduce, mv, duration]);

  return (
    <motion.span ref={ref} className={`tabular-nums ${className}`}>
      {text}
    </motion.span>
  );
}

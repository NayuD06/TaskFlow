import { Compass } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router';

export default function NotFound() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center rounded-[22px] border border-line bg-surface px-6 py-16 text-center"
    >
      <motion.div
        animate={{ rotate: [0, -14, 10, -6, 0] }}
        transition={{ duration: 1.6, delay: 0.3, ease: 'easeInOut' }}
        className="tone-accent grid size-14 place-items-center rounded-2xl"
      >
        <Compass className="size-7" aria-hidden="true" />
      </motion.div>
      <p className="mt-5 font-display text-5xl font-bold tracking-tight text-accent-hi">404</p>
      <h1 className="mt-2 font-display text-lg font-bold">Trang này trôi đi đâu mất rồi</h1>
      <p className="mt-2 max-w-sm text-[13px] text-muted">Đường dẫn không tồn tại hoặc đã bị đổi. Quay về trang tổng quan để tiếp tục nhé.</p>
      <Link to="/" className="mt-6 inline-flex h-10 items-center rounded-xl bg-accent px-4 text-[13px] font-semibold text-white hover:brightness-110">
        Về Tổng quan
      </Link>
    </motion.div>
  );
}

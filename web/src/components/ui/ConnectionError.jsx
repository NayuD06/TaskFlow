import { LoaderCircle, RotateCcw, WifiOff } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { API_URL } from '../../lib/api.js';
import { tr } from '../../lib/i18n.js';

/** Màn hình khi không gọi được API (server chưa chạy, sai VITE_API_URL, hoặc Render đang thức dậy). */
export default function ConnectionError({ error, onRetry }) {
  const [retrying, setRetrying] = useState(false);
  useEffect(() => setRetrying(false), [error]);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-[20px] border border-line bg-surface p-6 sm:p-8" role="alert">
      <div className="tone-danger grid size-12 place-items-center rounded-2xl">
        <WifiOff className="size-6" aria-hidden="true" />
      </div>
      <h2 className="mt-4 font-display text-lg font-bold">{tr('Không kết nối được tới API')}</h2>
      <p className="mt-2 max-w-prose leading-relaxed text-muted">
        {tr('Ứng dụng đang gọi')} <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[13px] text-ink">{API_URL}</code>{' '}
        {tr('nhưng không nhận được phản hồi')}
        {error?.status ? tr(' (mã {status})', { status: error.status }) : ''}
        {tr('. Kiểm tra server trong thư mục')} <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[13px] text-ink">api/</code>{' '}
        {tr('đã chạy chưa, hoặc biến')} <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[13px] text-ink">VITE_API_URL</code>{' '}
        {tr('đã đúng chưa. Nếu API ở Render bản miễn phí, lần đầu có thể mất khoảng 30 đến 50 giây để máy chủ thức dậy.')}
      </p>
      <button
        type="button"
        onClick={() => {
          setRetrying(true);
          onRetry();
        }}
        className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 font-semibold text-white hover:brightness-110"
      >
        {retrying ? <LoaderCircle className="size-4 animate-spin" /> : <RotateCcw className="size-4" aria-hidden="true" />}
        {tr('Thử lại')}
      </button>
    </motion.div>
  );
}

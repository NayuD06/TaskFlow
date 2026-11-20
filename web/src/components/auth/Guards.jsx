import { LoaderCircle, RotateCcw, WifiOff } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router';
import { API_URL } from '../../lib/api.js';
import { LogoMark } from '../shell/Logo.jsx';
import { useAuth } from './AuthContext.jsx';

/** Chỉ cho phép đường dẫn nội bộ, tránh bị lợi dụng chuyển hướng sang trang lạ. */
export function safeNext(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

/** Màn hình chờ khi đang kiểm tra phiên đăng nhập. */
export function Splash() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 3500);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-6 text-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center">
        <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}>
          <LogoMark size={56} />
        </motion.div>
        <p className="mt-5 flex items-center gap-2 text-[13px] text-muted">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Đang tải TaskFlow...
        </p>
        {slow && (
          <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-2 max-w-xs text-xs leading-relaxed text-faint">
            Máy chủ miễn phí có thể mất khoảng 30 đến 50 giây để thức dậy ở lần mở đầu tiên, bạn đợi chút nhé.
          </motion.p>
        )}
      </div>
    </div>
  );
}

function Offline() {
  const { retry } = useAuth();
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-6">
      <div className="max-w-md rounded-[22px] border border-line bg-surface p-6 text-center sm:p-8" role="alert">
        <div className="tone-danger mx-auto grid size-12 place-items-center rounded-2xl">
          <WifiOff className="size-6" aria-hidden="true" />
        </div>
        <h1 className="mt-4 font-display text-lg font-bold">Không kết nối được tới máy chủ</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          Không gọi được <code className="rounded bg-surface-2 px-1.5 py-0.5 text-ink">{API_URL}</code>. Có thể máy chủ đang khởi động hoặc mạng của bạn đang
          chập chờn.
        </p>
        <button
          type="button"
          onClick={retry}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-[13px] font-semibold text-white hover:brightness-110"
        >
          <RotateCcw className="size-4" aria-hidden="true" /> Thử lại
        </button>
      </div>
    </div>
  );
}

/** Bọc các trang cần đăng nhập. */
export function RequireAuth({ children }) {
  const { status, reason } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <Splash />;
  if (status === 'offline') return <Offline />;
  if (status !== 'authed') {
    const next = location.pathname + location.search;
    const plain = next === '/' || reason === 'logout';
    return <Navigate to={plain ? '/login' : `/login?next=${encodeURIComponent(next)}`} replace />;
  }
  return children;
}

/** Trang đăng nhập / đăng ký: đã đăng nhập rồi thì chuyển vào app. */
export function GuestOnly() {
  const { status } = useAuth();
  const [params] = useSearchParams();
  if (status === 'loading') return <Splash />;
  if (status === 'authed') return <Navigate to={safeNext(params.get('next'))} replace />;
  return <Outlet />;
}

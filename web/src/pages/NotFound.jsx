import { ArrowLeft, Home, Search } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../components/auth/AuthContext.jsx';
import { LogoMark } from '../components/shell/Logo.jsx';
import LangSwitch from '../components/ui/LangSwitch.jsx';
import { tr } from '../lib/i18n.js';

const W = 360;
const WAVE = `M0 14 Q 22.5 4 45 14 ${Array.from({ length: 15 }, (_, i) => `T ${90 + i * 45} 14`).join(' ')} V 160 H 0 Z`;

/** Số 404 rỗng ruột, nước dâng lên bên trong rồi dừng ở lưng chừng. */
function WaterDigits() {
  const reduce = useReducedMotion();
  const digits = (
    <text x="50%" y="128" textAnchor="middle" fontFamily="Unbounded, ui-sans-serif, sans-serif" fontWeight="800" fontSize="132" letterSpacing="-4">
      404
    </text>
  );
  return (
    <svg viewBox={`0 0 ${W} 150`} className="w-[min(84vw,440px)]" role="img" aria-label={tr('Lỗi 404')}>
      <defs>
        <clipPath id="nf-digits">{digits}</clipPath>
        <linearGradient id="nf-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent-hi)" />
          <stop offset="1" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      <g clipPath="url(#nf-digits)">
        <rect width={W} height="150" fill="var(--surface-2)" />
        <motion.g initial={{ y: reduce ? 70 : 150 }} animate={{ y: 70 }} transition={{ duration: 2.2, delay: 0.2, ease: [0.16, 0.84, 0.24, 1] }}>
          <path className="wave-drift-slow" d={WAVE} fill="var(--accent)" opacity="0.35" transform="translate(0 -8)" />
          <path className="wave-drift" d={WAVE} fill="url(#nf-water)" />
        </motion.g>
      </g>
    </svg>
  );
}

/** Trang 404 đứng riêng: dùng được cả khi chưa đăng nhập. */
export default function NotFound() {
  const { status } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const authed = status === 'authed';

  useEffect(() => {
    const prev = document.title;
    document.title = tr('Không tìm thấy trang · TaskFlow');
    return () => {
      document.title = prev;
    };
  }, []);

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-canvas px-4">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between py-5">
        <Link to="/" className="flex items-center gap-2" aria-label={tr('TaskFlow, về trang chủ')}>
          <LogoMark size={30} />
          <span className="font-display text-[16px] font-bold tracking-tight">TaskFlow</span>
        </Link>
        <LangSwitch />
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center pb-24 text-center">
        <WaterDigits />
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}>
          <h1 className="mt-6 font-display text-xl font-bold tracking-tight sm:text-2xl">{tr('Trang này trôi đi đâu mất rồi')}</h1>
          <p className="mx-auto mt-2.5 max-w-md text-[14px] leading-relaxed text-muted">
            {tr('Không có gì ở')} <code className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[13px] break-all text-ink">{pathname}</code>
            {tr('. Có thể đường dẫn bị gõ sai hoặc trang đã được đổi chỗ.')}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            <Link
              to="/"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-[14px] font-semibold text-white shadow-[0_10px_24px_-10px_var(--accent)] hover:brightness-110"
            >
              <Home className="size-4" aria-hidden="true" />
              {authed ? tr('Về Tổng quan') : tr('Về trang chủ')}
            </Link>
            {authed ? (
              <Link
                to="/projects"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-5 text-[14px] font-semibold hover:bg-surface-2"
              >
                <Search className="size-4" aria-hidden="true" /> {tr('Xem các dự án')}
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-5 text-[14px] font-semibold hover:bg-surface-2"
              >
                {tr('Đăng nhập')}
              </Link>
            )}
            {window.history.length > 1 && (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex h-11 items-center gap-2 rounded-xl px-4 text-[14px] font-semibold text-muted hover:text-ink"
              >
                <ArrowLeft className="size-4" aria-hidden="true" /> {tr('Quay lại')}
              </button>
            )}
          </div>
        </motion.div>
      </main>

      <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-[200%]" viewBox="0 0 1600 96" preserveAspectRatio="none" aria-hidden="true">
        <path
          className="wave-drift-slow"
          d="M0 52 Q50 38 100 52 T200 52 T300 52 T400 52 T500 52 T600 52 T700 52 T800 52 T900 52 T1000 52 T1100 52 T1200 52 T1300 52 T1400 52 T1500 52 T1600 52 V96 H0 Z"
          fill="var(--accent)"
          opacity="0.08"
        />
        <path
          className="wave-drift"
          d="M0 66 Q40 54 80 66 T160 66 T240 66 T320 66 T400 66 T480 66 T560 66 T640 66 T720 66 T800 66 T880 66 T960 66 T1040 66 T1120 66 T1200 66 T1280 66 T1360 66 T1440 66 T1520 66 T1600 66 V96 H0 Z"
          fill="var(--accent)"
          opacity="0.14"
        />
      </svg>
    </div>
  );
}

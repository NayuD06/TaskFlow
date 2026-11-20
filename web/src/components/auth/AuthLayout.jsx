import { CalendarDays, Check, KanbanSquare, Moon, Sun, TrendingUp } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect } from 'react';
import { Link } from 'react-router';
import { useTheme } from '../../lib/theme.js';
import { LogoMark, LogoWord } from '../shell/Logo.jsx';
import LangSwitch from '../ui/LangSwitch.jsx';
import { tr } from '../../lib/i18n.js';

// Sóng cho quả cầu minh hoạ: chu kỳ 24, dài gấp đôi khung để trôi liền mạch
const ORB_WAVE = `M0 8 Q6 2 12 8 ${Array.from({ length: 15 }, (_, i) => `T${24 + i * 12} 8`).join(' ')} V160 H0 Z`;

const FEATURES = [
  { icon: KanbanSquare, text: tr('Bảng Kanban kéo thả') },
  { icon: CalendarDays, text: tr('Lịch hạn chót') },
  { icon: TrendingUp, text: tr('Nhịp hoàn thành mỗi ngày') },
];

function Float({ children, delay = 0, className = '' }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={reduce ? { opacity: 1, y: 0 } : { opacity: 1, y: [0, -8, 0] }}
      transition={reduce ? { duration: 0.4, delay } : { opacity: { duration: 0.6, delay }, y: { duration: 6, delay, repeat: Infinity, ease: 'easeInOut' } }}
      className={`absolute rounded-2xl border border-white/10 bg-[#0b1630]/80 shadow-[0_24px_48px_-20px_rgb(0_0_0/0.7)] backdrop-blur-md ${className}`}
    >
      {children}
    </motion.div>
  );
}

/** Bảng minh hoạ bên trái: không phải dữ liệu thật, chỉ để giới thiệu sản phẩm. */
function Showcase() {
  return (
    <div className="relative hidden overflow-hidden rounded-[28px] bg-[radial-gradient(120%_90%_at_0%_0%,#123a9c_0%,#06143a_55%,#040b22_100%)] p-10 text-white lg:flex lg:flex-col">
      <Link to="/" className="flex w-fit items-center gap-2.5" aria-label={tr('TaskFlow, về trang chủ')}>
        <LogoMark size={36} />
        <LogoWord />
      </Link>

      <div className="relative z-10 mt-14 max-w-md">
        <h2 className="font-display text-[34px] leading-[1.15] font-bold tracking-tight">{tr('Mỗi việc xong, mực nước lại dâng.')}</h2>
        <p className="mt-4 text-[15px] leading-relaxed text-white/70">
          {tr('Quản lý dự án, kéo thả công việc, theo dõi hạn chót và nhìn tiến độ của bạn lớn dần lên mỗi ngày.')}
        </p>
        <ul className="mt-6 flex flex-wrap gap-2">
          {FEATURES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-2 rounded-full bg-white/[0.07] px-3 py-1.5 text-[13px] text-white/85 ring-1 ring-white/10">
              <Icon className="size-4 text-[#8fb0ff]" aria-hidden="true" /> {text}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative mt-8 min-h-64 max-h-[420px] flex-1" aria-hidden="true">
        <Float delay={0.2} className="top-[14%] left-0 w-64 p-4">
          <p className="text-[11px] font-semibold tracking-wide text-white/50 uppercase">{tr('Đang làm')}</p>
          <div className="mt-2.5 flex items-start gap-2.5 rounded-xl bg-white/[0.06] p-3">
            <span className="mt-0.5 grid size-4 place-items-center rounded-full border-2 border-[#ff4d6a]" />
            <div>
              <p className="text-[13px] font-medium">{tr('Viết chương 3: Thiết kế')}</p>
              <div className="mt-2 flex gap-1.5">
                <span className="rounded-full bg-[#ff4d6a]/15 px-2 py-0.5 text-[10px] font-semibold text-[#ff8da0]">{tr('Khẩn cấp')}</span>
                <span className="rounded-full bg-[#2f6bff]/20 px-2 py-0.5 text-[10px] font-semibold text-[#8fb0ff]">{tr('Mai {time}', { time: '17:00' })}</span>
              </div>
            </div>
          </div>
        </Float>

        <Float delay={0.45} className="top-[4%] right-[4%] flex w-44 flex-col items-center p-4">
          <div className="relative size-24 overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/15">
            <motion.div
              initial={{ y: 96 }}
              animate={{ y: 22 }}
              transition={{ duration: 1.8, delay: 0.6, ease: [0.16, 0.84, 0.24, 1] }}
              className="absolute inset-x-0 top-0 h-40"
            >
              <svg viewBox="0 0 96 160" className="size-full" preserveAspectRatio="none">
                <path className="wave-drift" d={ORB_WAVE} fill="#2f6bff" />
              </svg>
            </motion.div>
            <span className="absolute inset-0 grid place-items-center font-display text-xl font-bold">68%</span>
          </div>
          <p className="mt-2.5 text-[11px] text-white/60">{tr('Tiến độ tuần này')}</p>
        </Float>

        <Float delay={0.7} className="bottom-[16%] left-[22%] w-60 p-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-5 place-items-center rounded-full bg-[#22c38e]">
              <Check className="size-3 text-white" strokeWidth={3} />
            </span>
            <p className="text-[13px] text-white/60 line-through">{tr('Gửi bản nháp cho thầy')}</p>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
            <motion.div
              initial={{ width: '20%' }}
              animate={{ width: '75%' }}
              transition={{ duration: 1.6, delay: 1 }}
              className="h-full rounded-full bg-[#22c38e]"
            />
          </div>
        </Float>
      </div>

      <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-[200%]" viewBox="0 0 1600 96" preserveAspectRatio="none" aria-hidden="true">
        <path
          className="wave-drift-slow"
          d="M0 52 Q50 38 100 52 T200 52 T300 52 T400 52 T500 52 T600 52 T700 52 T800 52 T900 52 T1000 52 T1100 52 T1200 52 T1300 52 T1400 52 T1500 52 T1600 52 V96 H0 Z"
          fill="rgb(47 107 255 / 0.12)"
        />
        <path
          className="wave-drift"
          d="M0 66 Q40 54 80 66 T160 66 T240 66 T320 66 T400 66 T480 66 T560 66 T640 66 T720 66 T800 66 T880 66 T960 66 T1040 66 T1120 66 T1200 66 T1280 66 T1360 66 T1440 66 T1520 66 T1600 66 V96 H0 Z"
          fill="rgb(47 107 255 / 0.2)"
        />
      </svg>
    </div>
  );
}

export default function AuthLayout({ title, subtitle, children, footer, pageTitle }) {
  const { theme, toggle } = useTheme();
  useEffect(() => {
    document.title = `${pageTitle || title} · TaskFlow`;
  }, [pageTitle, title]);
  return (
    <div className="grid min-h-dvh bg-canvas p-3 lg:grid-cols-[1.05fr_1fr]">
      <Showcase />
      <main className="relative flex flex-col px-3 py-4 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 lg:invisible" aria-label={tr('TaskFlow, về trang chủ')}>
            <LogoMark size={30} />
            <span className="font-display text-[16px] font-bold tracking-tight">TaskFlow</span>
          </Link>
          <div className="flex items-center gap-2">
            <LangSwitch className="flex h-10 border border-line bg-surface px-2.5" />
            <button
              type="button"
              onClick={toggle}
              className="grid size-10 place-items-center rounded-xl border border-line bg-surface text-muted hover:text-ink"
              aria-label={theme === 'light' ? tr('Chuyển sang giao diện tối') : tr('Chuyển sang giao diện sáng')}
            >
              {theme === 'light' ? <Moon className="size-4" /> : <Sun className="size-4" />}
            </button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 0.84, 0.24, 1] }}
          className="mx-auto my-auto w-full max-w-[400px] py-10"
        >
          <h1 className="font-display text-[26px] leading-tight font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-[14px] text-muted">{subtitle}</p>}
          <div className="mt-7">{children}</div>
          {footer && <div className="mt-6 text-center text-[13px] text-muted">{footer}</div>}
        </motion.div>

        <p className="relative z-10 text-center text-xs text-faint">© {new Date().getFullYear()} TaskFlow</p>

        {/* Màn hình nhỏ không có bảng minh hoạ, thêm dải sóng nhẹ ở đáy cho đỡ trống */}
        <div className="pointer-events-none absolute -inset-x-3 -bottom-3 h-20 overflow-hidden lg:hidden" aria-hidden="true">
          <svg className="absolute bottom-0 h-full w-[200%]" viewBox="0 0 1600 80" preserveAspectRatio="none">
            <path
              className="wave-drift-slow"
              d="M0 40 Q50 26 100 40 T200 40 T300 40 T400 40 T500 40 T600 40 T700 40 T800 40 T900 40 T1000 40 T1100 40 T1200 40 T1300 40 T1400 40 T1500 40 T1600 40 V80 H0 Z"
              fill="var(--accent)"
              opacity="0.08"
            />
            <path
              className="wave-drift"
              d="M0 54 Q40 44 80 54 T160 54 T240 54 T320 54 T400 54 T480 54 T560 54 T640 54 T720 54 T800 54 T880 54 T960 54 T1040 54 T1120 54 T1200 54 T1280 54 T1360 54 T1440 54 T1520 54 T1600 54 V80 H0 Z"
              fill="var(--accent)"
              opacity="0.12"
            />
          </svg>
        </div>
      </main>
    </div>
  );
}

/** Thông báo đầu form (lỗi đăng nhập, phiên hết hạn...). */
export function Banner({ tone = 'danger', children }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      <p className={`mb-4 rounded-xl px-3.5 py-2.5 text-[13px] font-medium tone-${tone}`}>{children}</p>
    </motion.div>
  );
}

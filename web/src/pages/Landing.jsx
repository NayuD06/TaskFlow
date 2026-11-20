import {
  ArrowRight,
  CalendarDays,
  ChartSpline,
  ChevronDown,
  KanbanSquare,
  ListChecks,
  LoaderCircle,
  Moon,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
  Waves,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { firstName, useAuth } from '../components/auth/AuthContext.jsx';
import HeroDemo from '../components/landing/HeroDemo.jsx';
import TideSteps from '../components/landing/TideSteps.jsx';
import { LogoMark } from '../components/shell/Logo.jsx';
import { EASE_RISE } from '../components/ui/Motion.jsx';
import LangSwitch from '../components/ui/LangSwitch.jsx';
import { useToast } from '../components/ui/Toasts.jsx';
import { API_URL } from '../lib/api.js';
import { useTheme } from '../lib/theme.js';
import { tr } from '../lib/i18n.js';

const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL;
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD;
const HAS_DEMO = Boolean(DEMO_EMAIL && DEMO_PASSWORD);

const NAV = [
  { id: 'tinh-nang', label: tr('Tính năng') },
  { id: 'cach-dung', label: tr('Cách dùng') },
  { id: 'cau-hoi', label: tr('Câu hỏi') },
];

const TICKER = [
  tr('Bảng Kanban kéo thả'),
  tr('Lịch hạn chót'),
  tr('Checklist việc con'),
  tr('Ctrl K tìm nhanh'),
  tr('Giao diện tối và sáng'),
  tr('Kéo thả bằng bàn phím'),
  tr('Hoàn tác khi lỡ xoá'),
  tr('Biểu đồ nhịp hoàn thành'),
  tr('Dùng tốt trên điện thoại'),
];

const FEATURES = [
  {
    icon: KanbanSquare,
    title: tr('Bảng Kanban kéo thả'),
    body: tr('Ba cột Cần làm, Đang làm, Đã xong. Kéo bằng chuột, chạm trên điện thoại, hoặc dùng bàn phím.'),
  },
  { icon: CalendarDays, title: tr('Lịch hạn chót'), body: tr('Xem việc theo tháng, kéo sang ngày khác để dời hạn, kéo việc chưa có hạn vào lịch để đặt hạn.') },
  {
    icon: Waves,
    title: tr('Bể nước tiến độ'),
    body: tr('Mỗi dự án là một bể nước. Xong càng nhiều việc, mực nước càng dâng cao, nhìn là biết còn bao nhiêu.'),
  },
  { icon: ChartSpline, title: tr('Tổng quan trong một trang'), body: tr('Việc trễ hạn, đến hạn hôm nay, nhịp hoàn thành 14 ngày và tiến độ từng dự án.') },
  { icon: ListChecks, title: tr('Checklist việc con'), body: tr('Chia việc lớn thành từng bước nhỏ rồi tick dần. Bảng chi tiết tự lưu từng thay đổi.') },
  { icon: ShieldCheck, title: tr('Riêng tư và an toàn'), body: tr('Mật khẩu mã hoá bằng bcrypt, đăng nhập bằng JWT. Dữ liệu của bạn chỉ mình bạn xem được.') },
];

const FAQ = [
  { q: tr('TaskFlow có mất phí không?'), a: tr('Không. TaskFlow miễn phí, bạn chỉ cần một email để tạo tài khoản.') },
  {
    q: tr('Dữ liệu của tôi có an toàn không?'),
    a: tr(
      'Mật khẩu được mã hoá một chiều bằng bcrypt trước khi lưu, nên kể cả người quản trị cũng không đọc được. Mỗi tài khoản chỉ xem và sửa được dữ liệu của chính mình.',
    ),
  },
  HAS_DEMO && {
    q: tr('Tài khoản demo là gì?'),
    a: tr('Là tài khoản dùng chung có sẵn dữ liệu mẫu để bạn xem thử trước khi đăng ký. Vì ai cũng vào được nên đừng lưu thông tin riêng ở đó.'),
  },
  { q: tr('Dùng trên điện thoại được không?'), a: tr('Được. Giao diện tự co giãn theo màn hình, bảng Kanban kéo thả được bằng cảm ứng.') },
  {
    q: tr('Sao lần đầu mở hơi lâu?'),
    a: tr('Máy chủ miễn phí sẽ ngủ khi không có ai dùng. Lần mở đầu tiên có thể mất 30 đến 50 giây để máy chủ thức dậy, sau đó sẽ nhanh bình thường.'),
  },
  {
    q: tr('Tôi có xoá tài khoản được không?'),
    a: tr('Được. Vào trang Tài khoản, chọn Xoá tài khoản. Toàn bộ dự án và công việc của bạn sẽ bị xoá vĩnh viễn.'),
  },
].filter(Boolean);

const BOTTOM_WAVE = `M0 40 Q 60 22 120 40 ${Array.from({ length: 23 }, (_, i) => `T ${240 + i * 120} 40`).join(' ')} V 96 H 0 Z`;

const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.7, ease: EASE_RISE },
};

function scrollToId(id, reduce) {
  document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

/** Đăng nhập nhanh bằng tài khoản demo (chỉ có khi đặt VITE_DEMO_EMAIL và VITE_DEMO_PASSWORD). */
function useDemoLogin() {
  const { login } = useAuth();
  const notify = useToast();
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    try {
      const user = await login(DEMO_EMAIL, DEMO_PASSWORD);
      notify({ tone: 'success', message: tr('Chào mừng, {name}! Đây là dữ liệu mẫu để bạn xem thử.', { name: firstName(user.name) }) });
    } catch (err) {
      setLoading(false);
      notify({ tone: 'error', message: err.status === 0 ? tr('Máy chủ đang khởi động, bạn thử lại sau ít giây nhé.') : err.message });
    }
  };
  return { run, loading };
}

function PrimaryLink({ to, children, size = 'lg' }) {
  return (
    <Link
      to={to}
      className={`group inline-flex items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-white shadow-[0_14px_30px_-12px_var(--accent)] transition hover:brightness-110 ${
        size === 'lg' ? 'h-12 px-6 text-[15px]' : 'h-10 px-4 text-[13px]'
      }`}
    >
      {children}
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
}

function SecondaryAction({ demo, className = '' }) {
  const base = `inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-6 text-[15px] font-semibold transition hover:border-accent/50 hover:bg-surface-2 disabled:opacity-70 ${className}`;
  if (!HAS_DEMO) {
    return (
      <Link to="/login" className={base}>
        {tr('Đăng nhập')}
      </Link>
    );
  }
  return (
    <button type="button" onClick={demo.run} disabled={demo.loading} className={base}>
      {demo.loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4 text-accent-hi" aria-hidden="true" />}
      {tr('Dùng thử bản demo')}
    </button>
  );
}

function Nav({ reduce }) {
  const { theme, toggle } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
      <nav
        className={`mx-auto flex h-14 max-w-6xl items-center gap-2 rounded-2xl border px-3 transition-all duration-300 sm:gap-3 sm:px-4 ${
          scrolled ? 'border-line bg-surface/80 shadow-[0_12px_32px_-20px_rgb(0_0_0/0.6)] backdrop-blur-xl' : 'border-transparent'
        }`}
        aria-label={tr('Trang giới thiệu')}
      >
        <Link to="/" className="flex items-center gap-2" aria-label={tr('TaskFlow, trang chủ')}>
          <LogoMark size={30} />
          <span className="font-display text-[16px] font-bold tracking-tight">TaskFlow</span>
        </Link>
        <ul className="ml-6 hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <li key={n.id}>
              <a
                href={`#${n.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToId(n.id, reduce);
                }}
                className="rounded-lg px-3 py-2 text-[13px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
              >
                {n.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <LangSwitch className="hidden min-[400px]:flex" />
          <button
            type="button"
            onClick={toggle}
            className="hidden size-9 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink min-[400px]:grid"
            aria-label={theme === 'light' ? tr('Chuyển sang giao diện tối') : tr('Chuyển sang giao diện sáng')}
          >
            {theme === 'light' ? <Moon className="size-4" /> : <Sun className="size-4" />}
          </button>
          <Link to="/login" className="rounded-xl px-2.5 py-2 text-[13px] font-semibold whitespace-nowrap text-ink hover:bg-surface-2 sm:px-3">
            {tr('Đăng nhập')}
          </Link>
          <Link
            to="/register"
            className="inline-flex h-9 items-center rounded-xl bg-accent px-3.5 text-[13px] font-semibold whitespace-nowrap text-white shadow-[0_8px_20px_-10px_var(--accent)] hover:brightness-110"
          >
            <span className="sm:hidden">{tr('Đăng ký')}</span>
            <span className="hidden sm:inline">{tr('Bắt đầu miễn phí')}</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}

function HeroTitle({ reduce }) {
  // Câu tiêu đề tách theo từ để từng chữ trồi lên; phần cuối tô màu và có gạch sóng
  const words = tr('Làm xong việc, nhìn tiến độ').split(' ');
  const word = (w, i) => (
    <Fragment key={i}>
      <motion.span
        className="inline-block"
        initial={reduce ? false : { y: '0.6em', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.1 + i * 0.06, ease: EASE_RISE }}
      >
        {w}
      </motion.span>{' '}
    </Fragment>
  );
  return (
    <h1 className="font-display text-[38px] leading-[1.08] font-bold tracking-tight sm:text-[54px] lg:text-[64px]">
      {words.map(word)}
      <span className="relative inline-block whitespace-nowrap">
        <motion.span
          className="inline-block bg-[linear-gradient(100deg,#2f6bff_10%,#38bdf8_90%)] bg-clip-text text-transparent"
          initial={reduce ? false : { y: '0.6em', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.1 + words.length * 0.06, ease: EASE_RISE }}
        >
          {tr('dâng lên.')}
        </motion.span>
        {/* Gạch chân hình sóng tự vẽ */}
        <svg className="absolute -bottom-2 left-0 h-3 w-[92%] sm:-bottom-3 sm:h-4" viewBox="0 0 220 16" preserveAspectRatio="none" aria-hidden="true">
          <motion.path
            d="M2 9 Q 20 2 38 9 T 74 9 T 110 9 T 146 9 T 182 9 T 218 9"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="3.5"
            strokeLinecap="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, delay: 0.75, ease: 'easeInOut' }}
          />
        </svg>
      </span>
    </h1>
  );
}

function Hero({ reduce, demo }) {
  return (
    <section className="relative px-4 pt-10 pb-16 sm:px-6 sm:pt-16 lg:pt-20 lg:pb-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <div className="max-w-xl">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1.5 text-[12px] font-semibold text-muted backdrop-blur"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            {tr('Miễn phí · Không cần cài đặt')}
          </motion.p>

          <div className="mt-6">
            <HeroTitle reduce={reduce} />
          </div>

          <motion.p {...reveal} transition={{ ...reveal.transition, delay: 0.5 }} className="mt-7 text-[16px] leading-relaxed text-muted sm:text-[17px]">
            {tr(
              'TaskFlow gom dự án, công việc và hạn chót vào một chỗ. Kéo thả trên bảng Kanban, xem lịch tháng, và nhìn mực nước trong mỗi dự án dâng cao mỗi khi bạn làm xong một việc.',
            )}
          </motion.p>

          <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.6 }} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <PrimaryLink to="/register">{tr('Tạo tài khoản miễn phí')}</PrimaryLink>
            <SecondaryAction demo={demo} />
          </motion.div>

          <motion.ul {...reveal} transition={{ ...reveal.transition, delay: 0.7 }} className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted">
            <li className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-success" aria-hidden="true" /> {tr('Mật khẩu mã hoá bcrypt')}
            </li>
            <li className="flex items-center gap-1.5">
              <Smartphone className="size-4 text-accent-hi" aria-hidden="true" /> {tr('Dùng tốt trên điện thoại')}
            </li>
            <li className="flex items-center gap-1.5">
              <Moon className="size-4 text-accent-hi" aria-hidden="true" /> {tr('Giao diện tối và sáng')}
            </li>
          </motion.ul>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 40, rotate: 2 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.9, delay: 0.35, ease: EASE_RISE }}
        >
          <HeroDemo />
        </motion.div>
      </div>
    </section>
  );
}

function Ticker() {
  const items = [...TICKER, ...TICKER];
  return (
    <div className="relative overflow-hidden border-y border-line bg-surface/60 py-4" aria-label={tr('Các tính năng nổi bật')}>
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-canvas to-transparent sm:w-32" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-canvas to-transparent sm:w-32" />
      <ul className="marquee flex w-max items-center gap-8">
        {items.map((t, i) => (
          <li key={i} className="flex items-center gap-8 text-[14px] font-semibold whitespace-nowrap text-muted" aria-hidden={i >= TICKER.length}>
            {t}
            <svg width="10" height="13" viewBox="0 0 10 13" aria-hidden="true">
              <path d="M5 0 C 5 0 0 6 0 8.5 A 5 5 0 0 0 10 8.5 C 10 6 5 0 5 0 Z" fill="var(--accent)" opacity="0.7" />
            </svg>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionHead({ eyebrow, title, body }) {
  return (
    <motion.div {...reveal} className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-semibold tracking-[0.14em] text-accent-hi uppercase">{eyebrow}</p>
      <h2 className="mt-3 font-display text-[28px] leading-tight font-bold tracking-tight sm:text-[40px]">{title}</h2>
      {body && <p className="mt-4 text-[15px] leading-relaxed text-muted sm:text-[16px]">{body}</p>}
    </motion.div>
  );
}

const CARD_WAVE = `M0 10 Q 20 2 40 10 ${Array.from({ length: 19 }, (_, i) => `T ${80 + i * 40} 10`).join(' ')} V 40 H 0 Z`;

function Features() {
  return (
    <section id="tinh-nang" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:py-28">
      <SectionHead
        eyebrow={tr('Tính năng')}
        title={tr('Đủ để không sót việc nào')}
        body={tr('Từ đồ án tốt nghiệp, ôn thi đến việc nhà, mọi thứ nằm gọn trong vài dự án và một bảng kéo thả.')}
      />
      <motion.ul
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.15 }}
        variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        className="mx-auto mt-14 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <motion.li
            key={title}
            variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_RISE } } }}
            className="group relative overflow-hidden rounded-[22px] border border-line bg-surface p-6 transition-colors hover:border-accent/40"
          >
            {/* Rê chuột vào thì nước dâng lên trong thẻ */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-full translate-y-full transition-transform duration-700 ease-[cubic-bezier(0.16,0.84,0.24,1)] group-hover:translate-y-[58%]">
              <svg className="absolute bottom-[calc(100%-1px)] h-3 w-[200%]" viewBox="0 0 800 40" preserveAspectRatio="none" aria-hidden="true">
                <path className="wave-drift" d={CARD_WAVE} fill="var(--accent)" opacity="0.1" />
              </svg>
              <div className="h-full bg-accent/10" />
            </div>
            <div className="relative">
              <span className="grid size-11 place-items-center rounded-2xl bg-accent/12 text-accent-hi ring-1 ring-accent/20 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:rotate-[-6deg]">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-5 font-display text-[17px] font-bold tracking-tight">{title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">{body}</p>
            </div>
          </motion.li>
        ))}
      </motion.ul>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="cach-dung" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:py-28">
      <SectionHead eyebrow={tr('Cách dùng')} title={tr('Ba bước, nước đầy bể')} body={tr('Cuộn xuống để xem bể nước đầy dần theo từng bước.')} />
      <div className="mx-auto mt-14 max-w-5xl">
        <TideSteps />
      </div>
    </section>
  );
}

function FaqItem({ item, open, onToggle, index }) {
  const id = `faq-${index}`;
  return (
    <li className="rounded-2xl border border-line bg-surface">
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={id}
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-[15px] font-semibold"
        >
          {item.q}
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }} className="shrink-0 text-muted">
            <ChevronDown className="size-5" aria-hidden="true" />
          </motion.span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_RISE }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-5 text-[14px] leading-relaxed text-muted">{item.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section id="cau-hoi" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:py-28">
      <SectionHead eyebrow={tr('Câu hỏi thường gặp')} title={tr('Bạn đang thắc mắc?')} />
      <motion.ul {...reveal} className="mx-auto mt-12 max-w-3xl space-y-3">
        {FAQ.map((item, i) => (
          <FaqItem key={item.q} item={item} index={i} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
        ))}
      </motion.ul>
    </section>
  );
}

function FinalCta({ demo }) {
  return (
    <section className="px-4 pb-16 sm:px-6">
      <motion.div
        {...reveal}
        className="relative mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-[radial-gradient(120%_120%_at_0%_0%,#123a9c_0%,#06143a_55%,#040b22_100%)] px-6 pt-14 pb-28 text-center text-white sm:px-10 sm:pt-20 sm:pb-36"
      >
        <h2 className="mx-auto max-w-2xl font-display text-[28px] leading-tight font-bold tracking-tight sm:text-[44px]">
          {tr('Bể của bạn đang chờ được đổ đầy.')}
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-white/70 sm:text-[16px]">
          {tr('Tạo tài khoản chưa tới một phút. Mình tạo sẵn một dự án hướng dẫn để bạn làm quen ngay.')}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <PrimaryLink to="/register">{tr('Bắt đầu miễn phí')}</PrimaryLink>
          {HAS_DEMO ? (
            <button
              type="button"
              onClick={demo.run}
              disabled={demo.loading}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white/10 px-6 text-[15px] font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15 disabled:opacity-70"
            >
              {demo.loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
              {tr('Dùng thử bản demo')}
            </button>
          ) : (
            <Link
              to="/login"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-white/10 px-6 text-[15px] font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15"
            >
              {tr('Đăng nhập')}
            </Link>
          )}
        </div>
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-[200%] sm:h-28"
          viewBox="0 0 2880 96"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path className="wave-drift-slow" d={BOTTOM_WAVE} fill="rgb(47 107 255 / 0.18)" />
          <path className="wave-drift" d={BOTTOM_WAVE} transform="translate(0 14)" fill="rgb(47 107 255 / 0.3)" />
        </svg>
      </motion.div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-[13px] text-muted sm:flex-row">
        <div className="flex items-center gap-2">
          <LogoMark size={24} />
          <span className="font-display font-bold text-ink">TaskFlow</span>
          <span className="text-faint">© {new Date().getFullYear()}</span>
        </div>
        <p className="text-faint">{tr('Làm bằng React, Express và MongoDB.')}</p>
        <div className="flex items-center gap-4">
          <LangSwitch />
          <Link to="/login" className="hover:text-ink">
            {tr('Đăng nhập')}
          </Link>
          <Link to="/register" className="hover:text-ink">
            {tr('Đăng ký')}
          </Link>
        </div>
      </div>
    </footer>
  );
}

/** Trang giới thiệu cho khách chưa đăng nhập (đường dẫn "/"). */
export default function Landing() {
  const reduce = useReducedMotion();
  const demo = useDemoLogin();

  useEffect(() => {
    document.title = tr('TaskFlow · Quản lý dự án và công việc');
    // Đánh thức máy chủ Render (bản miễn phí hay ngủ) để lúc bấm đăng nhập không phải chờ lâu
    fetch(`${API_URL}/api/health`).catch(() => {});
    return () => {
      document.title = 'TaskFlow';
    };
  }, []);

  return (
    <div className="relative min-h-dvh overflow-x-clip bg-canvas">
      {/* Nền: quầng sáng xanh và lưới chấm mờ */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[900px]"
        style={{ background: 'radial-gradient(60% 55% at 70% 0%, color-mix(in oklab, var(--accent) 22%, transparent), transparent 70%)' }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[760px] opacity-60"
        style={{
          backgroundImage: 'radial-gradient(color-mix(in oklab, var(--ink) 14%, transparent) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          maskImage: 'radial-gradient(70% 60% at 50% 20%, black, transparent)',
          WebkitMaskImage: 'radial-gradient(70% 60% at 50% 20%, black, transparent)',
        }}
        aria-hidden="true"
      />

      <Nav reduce={reduce} />
      <main className="relative">
        <Hero reduce={reduce} demo={demo} />
        <Ticker />
        <Features />
        <HowItWorks />
        <Faq />
        <FinalCta demo={demo} />
      </main>
      <Footer />
    </div>
  );
}

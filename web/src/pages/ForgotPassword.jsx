import { ArrowLeft, LoaderCircle, MailCheck, Send } from 'lucide-react';
import { AnimatePresence, motion, useAnimate } from 'motion/react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import AuthLayout, { Banner } from '../components/auth/AuthLayout.jsx';
import { TextField } from '../components/auth/Fields.jsx';
import { useConfig } from '../hooks/queries.js';
import { api } from '../lib/api.js';
import { tr } from '../lib/i18n.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function ForgotPassword() {
  const [params] = useSearchParams();
  const { data: config } = useConfig();
  const [email, setEmail] = useState(params.get('email') || '');
  const [error, setError] = useState(null);
  const [banner, setBanner] = useState(null);
  const [sentTo, setSentTo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scope, animate] = useAnimate();
  // Bản build thật mà máy chủ chưa cấu hình email thì email sẽ không tới, báo trước cho người dùng
  const mailOff = config && !config.mail && import.meta.env.PROD;

  const submit = async (e) => {
    e.preventDefault();
    const value = email.trim();
    const problem = !value ? tr('Hãy nhập email') : !EMAIL_RE.test(value) ? tr('Email không hợp lệ') : null;
    setError(problem);
    setBanner(null);
    if (problem) {
      animate(scope.current, { x: [0, -10, 10, -6, 6, -2, 0] }, { duration: 0.45 });
      return;
    }
    setLoading(true);
    try {
      await api.auth.forgot(value);
      setSentTo(value);
    } catch (err) {
      if (err.fields?.email) setError(err.fields.email);
      else setBanner(err.status === 0 ? tr('Không kết nối được tới máy chủ. Hãy thử lại sau ít giây.') : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={tr('Quên mật khẩu')}
      subtitle={tr('Nhập email bạn đã đăng ký, TaskFlow sẽ gửi liên kết để đặt mật khẩu mới.')}
      footer={
        <Link to="/login" className="inline-flex items-center gap-1.5 font-semibold text-accent-hi hover:underline">
          <ArrowLeft className="size-4" aria-hidden="true" /> {tr('Quay lại đăng nhập')}
        </Link>
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {sentTo ? (
          <motion.div key="sent" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center" role="status">
            <motion.span
              initial={{ scale: 0.6, rotate: -12 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 16 }}
              className="tone-success mx-auto grid size-14 place-items-center rounded-2xl"
            >
              <MailCheck className="size-7" aria-hidden="true" />
            </motion.span>
            <h2 className="mt-4 font-display text-lg font-bold">{tr('Kiểm tra hộp thư của bạn')}</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              {tr('Nếu')} <strong className="text-ink">{sentTo}</strong>{' '}
              {tr('đã đăng ký TaskFlow, bạn sẽ nhận được email trong vài phút. Liên kết dùng được trong 30 phút.')}
            </p>
            <p className="mt-3 text-xs text-faint">{tr('Không thấy email? Hãy xem cả mục Thư rác hoặc Quảng cáo.')}</p>
            <button
              type="button"
              onClick={() => setSentTo(null)}
              className="mt-5 h-10 rounded-xl border border-line px-4 text-[13px] font-semibold hover:bg-surface-2"
            >
              {tr('Gửi lại hoặc dùng email khác')}
            </button>
          </motion.div>
        ) : (
          <motion.form key="form" ref={scope} onSubmit={submit} noValidate className="space-y-4" exit={{ opacity: 0, y: -8 }}>
            <AnimatePresence>{banner && <Banner>{banner}</Banner>}</AnimatePresence>
            {mailOff && (
              <Banner tone="warning">{tr('Máy chủ chưa bật gửi email nên chưa đặt lại mật khẩu qua email được. Hãy báo cho quản trị viên nhé.')}</Banner>
            )}
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="ban@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              error={error}
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || mailOff}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent text-[14px] font-semibold text-white shadow-[0_10px_24px_-10px_var(--accent)] transition hover:brightness-110 disabled:opacity-60"
            >
              {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
              {tr('Gửi liên kết đặt lại')}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}

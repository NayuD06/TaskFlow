import { ArrowRight, LoaderCircle, Sparkles } from 'lucide-react';
import { AnimatePresence, useAnimate } from 'motion/react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { firstName, useAuth } from '../components/auth/AuthContext.jsx';
import AuthLayout, { Banner } from '../components/auth/AuthLayout.jsx';
import { PasswordField, TextField } from '../components/auth/Fields.jsx';
import GoogleButton, { useGoogleEnabled } from '../components/auth/GoogleButton.jsx';
import { useToast } from '../components/ui/Toasts.jsx';
import { tr } from '../lib/i18n.js';

const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL;
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Login() {
  const { login, googleLogin, reason } = useAuth();
  const google = useGoogleEnabled();
  const notify = useToast();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(reason === 'expired' ? { tone: 'warning', text: tr('Phiên đăng nhập đã hết hạn, hãy đăng nhập lại.') } : null);
  const [loading, setLoading] = useState(null);
  const [scope, animate] = useAnimate();
  const shake = () => animate(scope.current, { x: [0, -10, 10, -6, 6, -2, 0] }, { duration: 0.45 });

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const run = async (email, password, kind) => {
    setLoading(kind);
    setBanner(null);
    try {
      const user = await login(email, password);
      notify({ tone: 'success', message: tr('Chào mừng trở lại, {name}!', { name: firstName(user.name) }) });
    } catch (err) {
      setLoading(null);
      shake();
      if (err.fields && err.status === 400) setErrors(err.fields);
      else setBanner({ tone: 'danger', text: err.status === 0 ? tr('Không kết nối được tới máy chủ. Hãy thử lại sau ít giây.') : err.message });
    }
  };

  const withGoogle = async (credential) => {
    setLoading('google');
    setBanner(null);
    try {
      const { user, created } = await googleLogin(credential);
      notify({
        tone: 'success',
        message: created
          ? tr('Chào mừng {name}! Đã có sẵn một dự án mẫu cho bạn.', { name: firstName(user.name) })
          : tr('Chào mừng trở lại, {name}!', { name: firstName(user.name) }),
      });
    } catch (err) {
      setLoading(null);
      setBanner({ tone: 'danger', text: err.status === 0 ? tr('Không kết nối được tới máy chủ. Hãy thử lại sau ít giây.') : err.message });
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const email = form.email.trim();
    const next = {};
    if (!email) next.email = tr('Hãy nhập email');
    else if (!EMAIL_RE.test(email)) next.email = tr('Email không hợp lệ');
    if (!form.password) next.password = tr('Hãy nhập mật khẩu');
    setErrors(next);
    if (Object.keys(next).length) {
      shake();
      return;
    }
    run(email, form.password, 'form');
  };

  return (
    <AuthLayout
      title={tr('Đăng nhập')}
      subtitle={tr('Chào bạn quay lại! Đăng nhập để tiếp tục công việc.')}
      footer={
        <>
          {tr('Chưa có tài khoản?')}{' '}
          <Link
            to={`/register${params.get('next') ? `?next=${encodeURIComponent(params.get('next'))}` : ''}`}
            className="font-semibold text-accent-hi hover:underline"
          >
            {tr('Đăng ký miễn phí')}
          </Link>
        </>
      }
    >
      <AnimatePresence>{banner && <Banner tone={banner.tone}>{banner.text}</Banner>}</AnimatePresence>

      <form ref={scope} onSubmit={submit} noValidate className="space-y-4">
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="ban@email.com"
          value={form.email}
          onChange={set('email')}
          error={errors.email}
          autoFocus
        />
        <PasswordField
          aside={
            <Link
              to={`/forgot-password${EMAIL_RE.test(form.email.trim()) ? `?email=${encodeURIComponent(form.email.trim())}` : ''}`}
              className="text-xs font-semibold text-accent-hi hover:underline"
            >
              {tr('Quên mật khẩu?')}
            </Link>
          }
          autoComplete="current-password"
          placeholder={tr('Nhập mật khẩu')}
          value={form.password}
          onChange={set('password')}
          error={errors.password}
        />
        <button
          type="submit"
          disabled={!!loading}
          className="group flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent text-[14px] font-semibold text-white shadow-[0_10px_24px_-10px_var(--accent)] transition hover:brightness-110 disabled:opacity-70"
        >
          {loading === 'form' ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <>
              {tr('Đăng nhập')} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      {(google || (DEMO_EMAIL && DEMO_PASSWORD)) && (
        <div className="my-5 flex items-center gap-3 text-xs text-faint">
          <span className="h-px flex-1 bg-line" /> {tr('hoặc')} <span className="h-px flex-1 bg-line" />
        </div>
      )}
      <div className="space-y-2.5">
        <GoogleButton onCredential={withGoogle} disabled={!!loading} />
        {loading === 'google' && (
          <p className="flex items-center justify-center gap-2 text-xs text-muted" role="status">
            <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> {tr('Đang đăng nhập bằng Google...')}
          </p>
        )}
        {DEMO_EMAIL && DEMO_PASSWORD && (
          <>
            <button
              type="button"
              disabled={!!loading}
              onClick={() => run(DEMO_EMAIL, DEMO_PASSWORD, 'demo')}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface text-[14px] font-semibold hover:border-accent/50 hover:bg-surface-2 disabled:opacity-70"
            >
              {loading === 'demo' ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="size-4 text-accent-hi" aria-hidden="true" />
              )}
              {tr('Dùng thử bằng tài khoản demo')}
            </button>
            <p className="text-center text-xs text-faint">{tr('Tài khoản demo dùng chung, dữ liệu có thể bị người khác thay đổi.')}</p>
          </>
        )}
      </div>
    </AuthLayout>
  );
}

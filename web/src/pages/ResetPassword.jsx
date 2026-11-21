import { ArrowRight, KeyRound, LoaderCircle } from 'lucide-react';
import { AnimatePresence, useAnimate } from 'motion/react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { firstName, useAuth } from '../components/auth/AuthContext.jsx';
import AuthLayout, { Banner } from '../components/auth/AuthLayout.jsx';
import { PasswordField, PasswordStrength } from '../components/auth/Fields.jsx';
import { useToast } from '../components/ui/Toasts.jsx';
import { api } from '../lib/api.js';
import { tr } from '../lib/i18n.js';

function check(form) {
  const errors = {};
  if (form.password.length < 8) errors.password = tr('Mật khẩu tối thiểu 8 ký tự');
  else if (new TextEncoder().encode(form.password).length > 72) errors.password = tr('Mật khẩu quá dài (tối đa 72 ký tự)');
  else if (!/\p{L}/u.test(form.password) || !/\d/.test(form.password)) errors.password = tr('Mật khẩu cần có cả chữ và số');
  else if (form.confirm !== form.password) errors.confirm = tr('Mật khẩu nhập lại không khớp');
  return errors;
}

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const { signIn } = useAuth();
  const notify = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [expired, setExpired] = useState(!token);
  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scope, animate] = useAnimate();

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const next = check(form);
    setErrors(next);
    setBanner(null);
    if (Object.keys(next).length) {
      animate(scope.current, { x: [0, -10, 10, -6, 6, -2, 0] }, { duration: 0.45 });
      return;
    }
    setLoading(true);
    try {
      const session = await api.auth.reset(token, form.password);
      signIn(session);
      notify({ tone: 'success', message: tr('Đã đặt mật khẩu mới. Chào mừng trở lại, {name}!', { name: firstName(session.user.name) }) });
      navigate('/', { replace: true });
    } catch (err) {
      setLoading(false);
      if (err.fields?.token) setExpired(true);
      else if (err.fields) setErrors(err.fields);
      else setBanner(err.status === 0 ? tr('Không kết nối được tới máy chủ. Hãy thử lại sau ít giây.') : err.message);
    }
  };

  return (
    <AuthLayout
      title={tr('Đặt mật khẩu mới')}
      subtitle={tr('Chọn mật khẩu mới cho tài khoản TaskFlow. Các thiết bị đang đăng nhập sẽ bị đăng xuất.')}
      footer={
        <Link to="/login" className="font-semibold text-accent-hi hover:underline">
          {tr('Quay lại đăng nhập')}
        </Link>
      }
    >
      {expired ? (
        <div className="text-center" role="alert">
          <span className="tone-warning mx-auto grid size-14 place-items-center rounded-2xl">
            <KeyRound className="size-7" aria-hidden="true" />
          </span>
          <h2 className="mt-4 font-display text-lg font-bold">{tr('Liên kết không còn dùng được')}</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">{tr('Liên kết đặt lại mật khẩu chỉ dùng được một lần và hết hạn sau 30 phút.')}</p>
          <Link
            to="/forgot-password"
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-[13px] font-semibold text-white hover:brightness-110"
          >
            {tr('Gửi liên kết mới')} <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <form ref={scope} onSubmit={submit} noValidate className="space-y-4">
          <AnimatePresence>{banner && <Banner>{banner}</Banner>}</AnimatePresence>
          <PasswordField
            label={tr('Mật khẩu mới')}
            autoComplete="new-password"
            value={form.password}
            onChange={set('password')}
            error={errors.password}
            autoFocus
          >
            <PasswordStrength password={form.password} />
          </PasswordField>
          <PasswordField
            label={tr('Nhập lại mật khẩu mới')}
            autoComplete="new-password"
            value={form.confirm}
            onChange={set('confirm')}
            error={errors.confirm}
          />
          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent text-[14px] font-semibold text-white shadow-[0_10px_24px_-10px_var(--accent)] transition hover:brightness-110 disabled:opacity-70"
          >
            {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : tr('Lưu mật khẩu mới')}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}

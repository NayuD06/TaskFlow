import { ArrowRight, LoaderCircle, ShieldCheck } from 'lucide-react';
import { AnimatePresence, useAnimate } from 'motion/react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { firstName, useAuth } from '../components/auth/AuthContext.jsx';
import AuthLayout, { Banner } from '../components/auth/AuthLayout.jsx';
import { PasswordField, PasswordStrength, TextField } from '../components/auth/Fields.jsx';
import { useToast } from '../components/ui/Toasts.jsx';
import { tr } from '../lib/i18n.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Kiểm tra phía trình duyệt cho nhanh. Server vẫn kiểm tra lại toàn bộ. */
function validate(form) {
  const errors = {};
  const name = form.name.trim();
  if (name.length < 2) errors.name = tr('Tên tối thiểu 2 ký tự');
  else if (name.length > 50) errors.name = tr('Tên tối đa 50 ký tự');
  if (!form.email.trim()) errors.email = tr('Hãy nhập email');
  else if (!EMAIL_RE.test(form.email.trim())) errors.email = tr('Email không hợp lệ');
  if (form.password.length < 8) errors.password = tr('Mật khẩu tối thiểu 8 ký tự');
  else if (new TextEncoder().encode(form.password).length > 72) errors.password = tr('Mật khẩu quá dài (tối đa 72 ký tự)');
  else if (!/\p{L}/u.test(form.password) || !/\d/.test(form.password)) errors.password = tr('Mật khẩu cần có cả chữ và số');
  if (!errors.password && form.confirm !== form.password) errors.confirm = tr('Mật khẩu nhập lại không khớp');
  return errors;
}

export default function Register() {
  const { register } = useAuth();
  const notify = useToast();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scope, animate] = useAnimate();
  const shake = () => animate(scope.current, { x: [0, -10, 10, -6, 6, -2, 0] }, { duration: 0.45 });

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const next = validate(form);
    setErrors(next);
    setBanner(null);
    if (Object.keys(next).length) {
      shake();
      return;
    }
    setLoading(true);
    try {
      const user = await register({ name: form.name.trim(), email: form.email.trim(), password: form.password });
      notify({ tone: 'success', message: tr('Chào mừng {name}! Đã có sẵn một dự án mẫu cho bạn.', { name: firstName(user.name) }) });
    } catch (err) {
      setLoading(false);
      shake();
      if (err.fields) setErrors(err.fields);
      else setBanner(err.status === 0 ? tr('Không kết nối được tới máy chủ. Hãy thử lại sau ít giây.') : err.message);
    }
  };

  return (
    <AuthLayout
      title={tr('Tạo tài khoản')}
      subtitle={tr('Miễn phí, chỉ mất chưa tới một phút.')}
      footer={
        <>
          {tr('Đã có tài khoản?')}{' '}
          <Link
            to={`/login${params.get('next') ? `?next=${encodeURIComponent(params.get('next'))}` : ''}`}
            className="font-semibold text-accent-hi hover:underline"
          >
            {tr('Đăng nhập')}
          </Link>
        </>
      }
    >
      <AnimatePresence>{banner && <Banner>{banner}</Banner>}</AnimatePresence>

      <form ref={scope} onSubmit={submit} noValidate className="space-y-4">
        <TextField
          label={tr('Họ và tên')}
          autoComplete="name"
          placeholder={tr('Nguyễn Văn A')}
          maxLength={50}
          value={form.name}
          onChange={set('name')}
          error={errors.name}
          autoFocus
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="ban@email.com"
          value={form.email}
          onChange={set('email')}
          error={errors.email}
        />
        <PasswordField autoComplete="new-password" placeholder={tr('Tạo mật khẩu')} value={form.password} onChange={set('password')} error={errors.password}>
          <PasswordStrength password={form.password} />
        </PasswordField>
        <PasswordField
          label={tr('Nhập lại mật khẩu')}
          autoComplete="new-password"
          placeholder={tr('Nhập lại mật khẩu')}
          value={form.confirm}
          onChange={set('confirm')}
          error={errors.confirm}
        />
        <button
          type="submit"
          disabled={loading}
          className="group flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent text-[14px] font-semibold text-white shadow-[0_10px_24px_-10px_var(--accent)] transition hover:brightness-110 disabled:opacity-70"
        >
          {loading ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <>
              {tr('Tạo tài khoản')} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </>
          )}
        </button>
        <p className="flex items-start gap-2 text-xs leading-relaxed text-faint">
          <ShieldCheck className="mt-px size-4 shrink-0 text-success" aria-hidden="true" />
          {tr('Mật khẩu được mã hoá một chiều (bcrypt) trước khi lưu, không ai đọc được kể cả quản trị viên.')}
        </p>
      </form>
    </AuthLayout>
  );
}

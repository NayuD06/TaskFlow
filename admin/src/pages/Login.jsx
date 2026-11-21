import { Eye, EyeOff, LogIn, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth.jsx';
import { AdminMark, AdminWordmark } from '../components/Logo.jsx';
import { Button } from '../components/ui.jsx';
import { WEB_URL } from '../lib/api.js';

export default function Login() {
  const { login, notice } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const field = 'mt-1.5 h-11 w-full rounded-xl border border-line bg-surface-2 px-3.5 text-sm outline-none placeholder:text-faint focus:border-accent';
  const message = error || notice;

  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="rise w-full max-w-sm">
        <div className="flex items-center gap-2.5">
          <AdminMark size={40} />
          <AdminWordmark />
        </div>
        <h1 className="mt-8 font-display text-[26px] font-bold tracking-tight">Đăng nhập quản trị</h1>
        <p className="mt-1.5 text-[13px] text-muted">Dùng tài khoản TaskFlow có quyền admin.</p>

        <form onSubmit={submit} className="mt-6 rounded-2xl border border-line bg-surface p-5 shadow-lift" noValidate>
          {message && (
            <p role="alert" className="mb-4 rounded-xl px-3 py-2.5 text-[13px] tone-danger">
              {message}
            </p>
          )}
          <label htmlFor="email" className="text-[13px] font-semibold">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
            placeholder="ban@email.com"
          />
          <label htmlFor="password" className="mt-4 block text-[13px] font-semibold">
            Mật khẩu
          </label>
          <div className="relative">
            <input
              id="password"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${field} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute top-1/2 right-1.5 mt-[3px] grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted hover:text-ink"
              aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {show ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
            </button>
          </div>
          <Button type="submit" variant="primary" className="mt-5 w-full justify-center" loading={busy} disabled={!email || !password}>
            {!busy && <LogIn className="size-4" aria-hidden="true" />}
            Đăng nhập
          </Button>
        </form>

        <div className="mt-5 flex gap-2.5 rounded-2xl bg-surface-2 p-4 text-[12.5px] leading-relaxed text-muted ring-1 ring-line">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-admin" aria-hidden="true" />
          <p>
            Chưa có quyền admin? Thêm email của bạn vào biến <code className="text-ink">ADMIN_EMAILS</code> trên Render rồi đăng nhập lại. Tài khoản tạo bằng
            Google cần đặt mật khẩu trước trong{' '}
            {WEB_URL ? (
              <a className="font-semibold text-accent-hi hover:underline" href={`${WEB_URL}/settings`} target="_blank" rel="noreferrer">
                Cài đặt của TaskFlow
              </a>
            ) : (
              'Cài đặt của TaskFlow'
            )}
            .
          </p>
        </div>
      </div>
    </main>
  );
}

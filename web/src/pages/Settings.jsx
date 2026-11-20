import { Check, KeyRound, LoaderCircle, LogOut, MonitorSmartphone, ShieldAlert, Trash2, UserRound } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { useAuth } from '../components/auth/AuthContext.jsx';
import { Avatar, PasswordField, PasswordStrength, TextField } from '../components/auth/Fields.jsx';
import { Card, RisePage, riseItem } from '../components/ui/Motion.jsx';
import { Dialog } from '../components/ui/Overlay.jsx';
import { useToast } from '../components/ui/Toasts.jsx';
import { api } from '../lib/api.js';
import { HUES, HUE_NAMES } from '../lib/constants.js';

const joined = new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });

function Section({ icon: Icon, title, description, children, tone }) {
  return (
    <Card className={`p-5 sm:p-6 ${tone === 'danger' ? 'border-danger/30' : ''}`}>
      <div className="flex items-start gap-3">
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${tone === 'danger' ? 'tone-danger' : 'tone-accent'}`}>
          <Icon className="size-[18px]" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-display text-[15px] font-bold">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </Card>
  );
}

function SubmitButton({ loading, children, disabled, danger }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-[13px] font-semibold text-white hover:brightness-110 disabled:opacity-50 ${danger ? 'bg-danger' : 'bg-accent'}`}
    >
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

function ProfileForm({ user, locked }) {
  const { setUser } = useAuth();
  const notify = useToast();
  const [name, setName] = useState(user.name);
  const [color, setColor] = useState(user.avatarColor || 'blue');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const dirty = name.trim() !== user.name || color !== user.avatarColor;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      setUser(await api.auth.update({ name: name.trim(), avatarColor: color }));
      notify({ tone: 'success', message: 'Đã lưu hồ sơ' });
    } catch (err) {
      setError(err.fields?.name || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-center gap-4">
        <motion.div key={color + name.trim().split(/\s+/).pop()} initial={{ scale: 0.85, rotate: -8 }} animate={{ scale: 1, rotate: 0 }}>
          <Avatar user={{ name: name || user.name, avatarColor: color }} size={56} />
        </motion.div>
        <div className="min-w-0">
          <p className="truncate font-semibold">{name.trim() || user.name}</p>
          <p className="truncate text-[13px] text-muted">{user.email}</p>
          <p className="mt-0.5 text-xs text-faint">Tham gia từ {joined.format(new Date(user.createdAt))}</p>
        </div>
      </div>
      <TextField label="Họ và tên" value={name} maxLength={50} onChange={(e) => setName(e.target.value)} error={error} disabled={locked} />
      <fieldset disabled={locked}>
        <legend className="mb-2 text-[13px] font-semibold">Màu ảnh đại diện</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(HUES).map(([key, hex]) => (
            <button
              key={key}
              type="button"
              onClick={() => setColor(key)}
              aria-label={HUE_NAMES[key]}
              aria-pressed={color === key}
              className="grid size-8 place-items-center rounded-full ring-offset-2 ring-offset-surface transition-transform hover:scale-110 disabled:hover:scale-100"
              style={{ background: hex, boxShadow: color === key ? `0 0 0 2px var(--surface), 0 0 0 4px ${hex}` : undefined }}
            >
              {color === key && <Check className="size-4 text-white" strokeWidth={3} />}
            </button>
          ))}
        </div>
      </fieldset>
      <SubmitButton loading={loading} disabled={!dirty || locked}>
        Lưu thay đổi
      </SubmitButton>
    </form>
  );
}

function PasswordForm({ locked }) {
  const { setUser, replaceToken } = useAuth();
  const notify = useToast();
  const empty = { currentPassword: '', newPassword: '', confirm: '' };
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.currentPassword) next.currentPassword = 'Hãy nhập mật khẩu hiện tại';
    if (form.newPassword.length < 8) next.newPassword = 'Mật khẩu tối thiểu 8 ký tự';
    else if (!/\p{L}/u.test(form.newPassword) || !/\d/.test(form.newPassword)) next.newPassword = 'Mật khẩu cần có cả chữ và số';
    else if (form.confirm !== form.newPassword) next.confirm = 'Mật khẩu nhập lại không khớp';
    setErrors(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    try {
      const { user, token } = await api.auth.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      replaceToken(token);
      setUser(user);
      setForm(empty);
      notify({ tone: 'success', message: 'Đã đổi mật khẩu. Các thiết bị khác đã được đăng xuất.' });
    } catch (err) {
      if (err.fields) setErrors(err.fields);
      else notify({ tone: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:max-w-md">
      <PasswordField
        label="Mật khẩu hiện tại"
        autoComplete="current-password"
        value={form.currentPassword}
        onChange={set('currentPassword')}
        error={errors.currentPassword}
        disabled={locked}
      />
      <PasswordField
        label="Mật khẩu mới"
        autoComplete="new-password"
        value={form.newPassword}
        onChange={set('newPassword')}
        error={errors.newPassword}
        disabled={locked}
      >
        {form.newPassword && <PasswordStrength password={form.newPassword} />}
      </PasswordField>
      <PasswordField
        label="Nhập lại mật khẩu mới"
        autoComplete="new-password"
        value={form.confirm}
        onChange={set('confirm')}
        error={errors.confirm}
        disabled={locked}
      />
      <div>
        <SubmitButton loading={loading} disabled={locked}>
          Đổi mật khẩu
        </SubmitButton>
      </div>
    </form>
  );
}

function DeleteAccount({ locked }) {
  const { logout } = useAuth();
  const notify = useToast();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.auth.remove(password);
      setOpen(false);
      logout();
      notify({ message: `Đã xoá tài khoản cùng ${res.deletedProjects} dự án và ${res.deletedTasks} công việc. Hẹn gặp lại!` });
    } catch (err) {
      setError(err.fields?.password || err.message);
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={locked}
        onClick={() => {
          setPassword('');
          setError(null);
          setOpen(true);
        }}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-danger/40 px-4 text-[13px] font-semibold text-danger hover:bg-danger/10 disabled:opacity-50"
      >
        <Trash2 className="size-4" aria-hidden="true" /> Xoá tài khoản
      </button>
      <Dialog open={open} onClose={() => !loading && setOpen(false)} title="Xoá vĩnh viễn tài khoản?" labelId="delete-account-title">
        <form onSubmit={submit}>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            Toàn bộ dự án, công việc và lịch sử hoạt động của bạn sẽ bị xoá và <strong className="text-ink">không thể khôi phục</strong>. Nhập mật khẩu để xác
            nhận.
          </p>
          <div className="mt-4">
            <PasswordField
              label="Mật khẩu"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={error}
              autoFocus
            />
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-10 rounded-xl px-4 text-[13px] font-semibold text-muted hover:bg-surface-2 hover:text-ink"
            >
              Huỷ
            </button>
            <SubmitButton loading={loading} disabled={!password} danger>
              Xoá vĩnh viễn
            </SubmitButton>
          </div>
        </form>
      </Dialog>
    </>
  );
}

export default function Settings() {
  const { user, logout } = useAuth();
  const notify = useToast();
  const [loggingOut, setLoggingOut] = useState(false);
  const locked = !!user.isDemo;

  const logoutAll = async () => {
    setLoggingOut(true);
    try {
      await api.auth.logoutAll();
      logout();
      notify({ message: 'Đã đăng xuất khỏi mọi thiết bị' });
    } catch (err) {
      notify({ tone: 'error', message: err.message });
      setLoggingOut(false);
    }
  };

  return (
    <RisePage className="mx-auto max-w-3xl space-y-3.5">
      <motion.div variants={riseItem}>
        <h1 className="font-display text-2xl font-bold tracking-tight">Tài khoản</h1>
        <p className="mt-1 text-[13px] text-muted">Quản lý hồ sơ, mật khẩu và phiên đăng nhập của bạn.</p>
      </motion.div>

      {locked && (
        <motion.p variants={riseItem} className="tone-warning flex items-start gap-2.5 rounded-2xl px-4 py-3 text-[13px] font-medium">
          <ShieldAlert className="mt-px size-4 shrink-0" aria-hidden="true" />
          Đây là tài khoản demo dùng chung nên không đổi được hồ sơ, mật khẩu hay xoá tài khoản. Hãy đăng ký tài khoản riêng để dùng đầy đủ.
        </motion.p>
      )}

      <Section icon={UserRound} title="Hồ sơ" description="Tên và màu hiển thị trong ứng dụng.">
        <ProfileForm user={user} locked={locked} />
      </Section>

      <Section icon={KeyRound} title="Đổi mật khẩu" description="Sau khi đổi, các thiết bị khác sẽ phải đăng nhập lại.">
        <PasswordForm locked={locked} />
      </Section>

      <Section icon={MonitorSmartphone} title="Phiên đăng nhập" description="Đăng xuất ở máy này, hoặc ở mọi nơi bạn từng đăng nhập.">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              logout();
              notify({ message: 'Đã đăng xuất' });
            }}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-line px-4 text-[13px] font-semibold hover:bg-surface-2"
          >
            <LogOut className="size-4" aria-hidden="true" /> Đăng xuất
          </button>
          <button
            type="button"
            onClick={logoutAll}
            disabled={locked || loggingOut}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-line px-4 text-[13px] font-semibold hover:bg-surface-2 disabled:opacity-50"
          >
            {loggingOut ? <LoaderCircle className="size-4 animate-spin" /> : <MonitorSmartphone className="size-4" aria-hidden="true" />}
            Đăng xuất mọi thiết bị
          </button>
        </div>
      </Section>

      <Section icon={Trash2} tone="danger" title="Xoá tài khoản" description="Xoá vĩnh viễn tài khoản và toàn bộ dữ liệu.">
        <DeleteAccount locked={locked} />
      </Section>
    </RisePage>
  );
}

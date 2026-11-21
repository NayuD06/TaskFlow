import { LANGS, lang, locale, setLang } from '../lib/i18n.js';
import {
  Bug,
  Check,
  DatabaseBackup,
  FileJson,
  FileSpreadsheet,
  FileUp,
  ImageUp,
  Info,
  KeyRound,
  Languages,
  LoaderCircle,
  LogOut,
  MonitorSmartphone,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../components/auth/AuthContext.jsx';
import { Avatar, PasswordField, PasswordStrength, TextField } from '../components/auth/Fields.jsx';
import { Card, RisePage, riseItem } from '../components/ui/Motion.jsx';
import { Dialog } from '../components/ui/Overlay.jsx';
import { useToast } from '../components/ui/Toasts.jsx';
import { api } from '../lib/api.js';
import { applyAccent } from '../lib/accent.js';
import { AVATAR_EMOJIS, HUES, HUE_NAMES } from '../lib/constants.js';
import { avatarBlobFromFile, avatarFromFile } from '../lib/image.js';
import { uploadImage } from '../lib/cloudinary.js';
import { useConfig } from '../hooks/queries.js';
import { useQueryClient } from '@tanstack/react-query';
import { tr } from '../lib/i18n.js';
import { APP_VERSION, AUTHOR, ISSUES_URL, REPO_URL } from '../lib/about.js';
import GithubMark from '../components/ui/GithubMark.jsx';

// Địa chỉ trang quản trị (thư mục admin/), chỉ hiện nút cho tài khoản admin
const ADMIN_URL = (import.meta.env.VITE_ADMIN_URL || '').replace(/\/$/, '');
const joined = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' });

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
      className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-[13px] font-semibold text-white hover:brightness-110 disabled:opacity-50 ${danger ? 'bg-danger-solid' : 'bg-accent'}`}
    >
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

function Swatches({ value, onChange, label }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(HUES).map(([key, hex]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-label={`${label}: ${HUE_NAMES[key]}`}
          aria-pressed={value === key}
          title={HUE_NAMES[key]}
          className="grid size-8 place-items-center rounded-full transition-transform hover:scale-110 disabled:hover:scale-100"
          style={{ background: hex, boxShadow: value === key ? `0 0 0 2px var(--surface), 0 0 0 4px ${hex}` : undefined }}
        >
          {value === key && <Check className="size-4 text-white drop-shadow" strokeWidth={3} />}
        </button>
      ))}
    </div>
  );
}

function ProfileForm({ user, locked }) {
  const { setUser } = useAuth();
  const notify = useToast();
  const { data: config } = useConfig();
  const uploads = config?.uploads;
  const fileRef = useRef(null);
  const [name, setName] = useState(user.name);
  const [color, setColor] = useState(user.avatarColor || 'blue');
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [accent, setAccent] = useState(user.accentColor || 'blue');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reading, setReading] = useState(false);
  const saved = useRef(user);
  saved.current = user;

  const dirty = name.trim() !== user.name || color !== user.avatarColor || avatar !== (user.avatar || '') || accent !== (user.accentColor || 'blue');

  // Xem trước màu nhấn ngay khi chọn; rời trang mà chưa lưu thì trả lại màu cũ
  useEffect(() => applyAccent(accent), [accent]);
  useEffect(() => () => applyAccent(saved.current.accentColor), []);

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setReading(true);
    try {
      // Có Cloudinary thì lưu ảnh nét hơn trên đó, không thì lưu ảnh nhỏ thẳng trong tài khoản
      if (uploads) {
        const square = await avatarBlobFromFile(file);
        const { url } = await uploadImage(square, { ...uploads, kind: 'avatars' });
        setAvatar(url);
      } else {
        setAvatar(await avatarFromFile(file));
      }
    } catch (err) {
      notify({ tone: 'error', message: err.message });
    } finally {
      setReading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      setUser(await api.auth.update({ name: name.trim(), avatarColor: color, avatar, accentColor: accent }));
      notify({ tone: 'success', message: tr('Đã lưu hồ sơ') });
    } catch (err) {
      setError(err.fields?.name || err.message);
      if (!err.fields?.name) notify({ tone: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const preview = { name: name || user.name, avatarColor: color, avatar };
  const options = [{ value: '', label: tr('Chữ cái đầu') }, ...AVATAR_EMOJIS.map((e) => ({ value: `emoji:${e}`, label: e }))];

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-center gap-4">
        <motion.div key={avatar.slice(0, 40) + color + name.trim().split(/\s+/).pop()} initial={{ scale: 0.85, rotate: -8 }} animate={{ scale: 1, rotate: 0 }}>
          <Avatar user={preview} size={64} />
        </motion.div>
        <div className="min-w-0">
          <p className="truncate font-semibold">{name.trim() || user.name}</p>
          <p className="truncate text-[13px] text-muted">{user.email}</p>
          <p className="mt-0.5 text-xs text-faint">
            {tr('Tham gia từ')} {joined.format(new Date(user.createdAt))}
          </p>
        </div>
      </div>
      <TextField label={tr('Họ và tên')} value={name} maxLength={50} onChange={(e) => setName(e.target.value)} error={error} disabled={locked} />

      <fieldset disabled={locked}>
        <legend className="mb-2 text-[13px] font-semibold">{tr('Ảnh đại diện')}</legend>
        <div className="flex flex-wrap items-center gap-2">
          {options.map((o) => {
            const active = avatar === o.value;
            return (
              <button
                key={o.value || 'letter'}
                type="button"
                onClick={() => setAvatar(o.value)}
                aria-pressed={active}
                aria-label={o.value ? tr('Ảnh đại diện {label}', { label: o.label }) : o.label}
                title={o.value ? undefined : o.label}
                className={`rounded-full transition-transform hover:scale-110 disabled:hover:scale-100 ${active ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : ''}`}
              >
                <Avatar user={{ name: name || user.name, avatarColor: color, avatar: o.value }} size={38} />
              </button>
            );
          })}
          {(avatar.startsWith('data:image/') || avatar.startsWith('https://')) && (
            <span className="rounded-full ring-2 ring-accent ring-offset-2 ring-offset-surface">
              <Avatar user={preview} size={38} />
            </span>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="sr-only"
            tabIndex={-1}
            onChange={pickFile}
            aria-hidden="true"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex h-[38px] items-center gap-2 rounded-full border border-dashed border-line-strong px-3.5 text-[13px] font-semibold text-muted hover:border-accent hover:text-ink"
          >
            {reading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <ImageUp className="size-4" aria-hidden="true" />}
            {tr('Tải ảnh lên')}
          </button>
        </div>
        <p className="mt-2 text-xs text-faint">
          {uploads ? tr('Ảnh được cắt vuông trên máy bạn rồi lưu trên Cloudinary.') : tr('Ảnh được cắt vuông và thu nhỏ ngay trên máy bạn trước khi lưu.')}
        </p>
      </fieldset>

      <fieldset disabled={locked}>
        <legend className="mb-2 text-[13px] font-semibold">{tr('Màu nền ảnh đại diện')}</legend>
        <Swatches value={color} onChange={setColor} label={tr('Màu nền')} />
      </fieldset>

      <fieldset disabled={locked}>
        <legend className="mb-1 text-[13px] font-semibold">{tr('Màu nhấn của giao diện')}</legend>
        <p className="mb-2.5 text-xs text-faint">{tr('Đổi màu nút bấm, viền chọn và các điểm nhấn. Xem trước ngay, bấm Lưu để giữ lại.')}</p>
        <Swatches value={accent} onChange={setAccent} label={tr('Màu nhấn')} />
        <div className="mt-3 flex flex-wrap items-center gap-2" aria-hidden="true">
          <span className="inline-flex h-8 items-center rounded-lg bg-accent px-3 text-xs font-semibold text-white">{tr('Nút chính')}</span>
          <span className="tone-accent inline-flex h-8 items-center rounded-lg px-3 text-xs font-semibold">{tr('Đang làm')}</span>
          <span className="inline-flex h-8 items-center rounded-lg border border-accent px-3 text-xs font-semibold text-accent-hi">{tr('Đang chọn')}</span>
        </div>
      </fieldset>

      <SubmitButton loading={loading} disabled={!dirty || locked}>
        {tr('Lưu thay đổi')}
      </SubmitButton>
    </form>
  );
}

function PasswordForm({ locked, firstTime }) {
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
    if (!firstTime && !form.currentPassword) next.currentPassword = tr('Hãy nhập mật khẩu hiện tại');
    if (form.newPassword.length < 8) next.newPassword = tr('Mật khẩu tối thiểu 8 ký tự');
    else if (!/\p{L}/u.test(form.newPassword) || !/\d/.test(form.newPassword)) next.newPassword = tr('Mật khẩu cần có cả chữ và số');
    else if (form.confirm !== form.newPassword) next.confirm = tr('Mật khẩu nhập lại không khớp');
    setErrors(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    try {
      const { user, token } = await api.auth.changePassword({ currentPassword: firstTime ? '' : form.currentPassword, newPassword: form.newPassword });
      replaceToken(token);
      setUser(user);
      setForm(empty);
      notify({
        tone: 'success',
        message: firstTime
          ? tr('Đã đặt mật khẩu. Từ giờ bạn đăng nhập được bằng email và mật khẩu.')
          : tr('Đã đổi mật khẩu. Các thiết bị khác đã được đăng xuất.'),
      });
    } catch (err) {
      if (err.fields) setErrors(err.fields);
      else notify({ tone: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:max-w-md">
      {!firstTime && (
        <PasswordField
          label={tr('Mật khẩu hiện tại')}
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={set('currentPassword')}
          error={errors.currentPassword}
          disabled={locked}
        />
      )}
      <PasswordField
        label={tr('Mật khẩu mới')}
        autoComplete="new-password"
        value={form.newPassword}
        onChange={set('newPassword')}
        error={errors.newPassword}
        disabled={locked}
      >
        {form.newPassword && <PasswordStrength password={form.newPassword} />}
      </PasswordField>
      <PasswordField
        label={tr('Nhập lại mật khẩu mới')}
        autoComplete="new-password"
        value={form.confirm}
        onChange={set('confirm')}
        error={errors.confirm}
        disabled={locked}
      />
      <div>
        <SubmitButton loading={loading} disabled={locked}>
          {firstTime ? tr('Đặt mật khẩu') : tr('Đổi mật khẩu')}
        </SubmitButton>
      </div>
    </form>
  );
}

function DeleteAccount({ locked }) {
  const { logout, user } = useAuth();
  const byEmail = user.hasPassword === false;
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
      const res = await api.auth.remove(byEmail ? { confirm: password.trim() } : { password });
      setOpen(false);
      logout();
      notify({
        message: tr('Đã xoá tài khoản cùng {deletedProjects} dự án và {deletedTasks} công việc. Hẹn gặp lại!', {
          deletedProjects: res.deletedProjects,
          deletedTasks: res.deletedTasks,
        }),
      });
    } catch (err) {
      setError(err.fields?.password || err.fields?.confirm || err.message);
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
        <Trash2 className="size-4" aria-hidden="true" /> {tr('Xoá tài khoản')}
      </button>
      <Dialog open={open} onClose={() => !loading && setOpen(false)} title={tr('Xoá vĩnh viễn tài khoản?')} labelId="delete-account-title">
        <form onSubmit={submit}>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            {tr('Toàn bộ dự án, công việc và lịch sử hoạt động của bạn sẽ bị xoá và')} <strong className="text-ink">{tr('không thể khôi phục')}</strong>
            {byEmail ? tr('. Gõ email của bạn để xác nhận.') : tr('. Nhập mật khẩu để xác nhận.')}
          </p>
          <div className="mt-4">
            {byEmail ? (
              <TextField
                label={tr('Email của bạn')}
                type="email"
                autoComplete="off"
                placeholder={user.email}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={error}
                autoFocus
              />
            ) : (
              <PasswordField
                label={tr('Mật khẩu')}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={error}
                autoFocus
              />
            )}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-10 rounded-xl px-4 text-[13px] font-semibold text-muted hover:bg-surface-2 hover:text-ink"
            >
              {tr('Huỷ')}
            </button>
            <SubmitButton loading={loading} disabled={!password} danger>
              {tr('Xoá vĩnh viễn')}
            </SubmitButton>
          </div>
        </form>
      </Dialog>
    </>
  );
}

function saveFile({ blob, filename }) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function DataSection({ locked }) {
  const notify = useToast();
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(null);
  const [pending, setPending] = useState(null); // file JSON đang chờ xác nhận nhập

  const exportAs = async (format) => {
    setBusy(format);
    try {
      saveFile(await api.exportData(format, lang));
      notify({ tone: 'success', message: format === 'csv' ? tr('Đã tải file CSV') : tr('Đã tải file sao lưu JSON') });
    } catch (err) {
      notify({ tone: 'error', message: err.message });
    } finally {
      setBusy(null);
    }
  };

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return notify({ tone: 'error', message: tr('File quá lớn (tối đa 5 MB)') });
    try {
      const data = JSON.parse(await file.text());
      if (data?.app !== 'TaskFlow' || !Array.isArray(data.projects)) throw new Error();
      const tasks = data.projects.reduce((n, p) => n + (Array.isArray(p.tasks) ? p.tasks.length : 0), 0);
      setPending({ data, name: file.name, projects: data.projects.length, tasks });
    } catch {
      notify({ tone: 'error', message: tr('File không đúng định dạng xuất của TaskFlow') });
    }
  };

  const runImport = async () => {
    setBusy('import');
    try {
      const res = await api.importData(pending.data);
      setPending(null);
      qc.invalidateQueries();
      notify({ tone: 'success', message: tr('Đã nhập {projects} dự án và {tasks} công việc', res) });
    } catch (err) {
      notify({ tone: 'error', message: err.message });
    } finally {
      setBusy(null);
    }
  };

  const button = 'inline-flex h-10 items-center gap-2 rounded-xl border border-line px-4 text-[13px] font-semibold hover:bg-surface-2 disabled:opacity-50';
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={button} onClick={() => exportAs('json')} disabled={!!busy}>
          {busy === 'json' ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <FileJson className="size-4" aria-hidden="true" />}
          {tr('Tải bản sao lưu (JSON)')}
        </button>
        <button type="button" className={button} onClick={() => exportAs('csv')} disabled={!!busy}>
          {busy === 'csv' ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <FileSpreadsheet className="size-4" aria-hidden="true" />}
          {tr('Xuất bảng công việc (CSV)')}
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={pickFile} />
        <button type="button" className={button} onClick={() => fileRef.current?.click()} disabled={locked || !!busy}>
          <FileUp className="size-4" aria-hidden="true" />
          {tr('Nhập từ file JSON')}
        </button>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-faint">
        {tr(
          'Bản sao lưu gồm các dự án của bạn (không gồm dự án người khác chia sẻ). File CSV mở được bằng Excel hoặc Google Sheets. Nhập file luôn thêm dự án mới, không ghi đè dữ liệu đang có.',
        )}
      </p>

      <Dialog open={!!pending} onClose={() => busy !== 'import' && setPending(null)} title={tr('Nhập dữ liệu từ file?')} labelId="import-title">
        {pending && (
          <>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              {tr('File')} <strong className="text-ink">{pending.name}</strong>{' '}
              {tr('có {projects} dự án và {tasks} công việc. Tất cả sẽ được thêm thành dự án mới trong tài khoản của bạn.', pending)}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPending(null)}
                className="h-10 rounded-xl px-4 text-[13px] font-semibold text-muted hover:bg-surface-2 hover:text-ink"
              >
                {tr('Huỷ')}
              </button>
              <button
                type="button"
                onClick={runImport}
                disabled={busy === 'import'}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-[13px] font-semibold text-white hover:brightness-110 disabled:opacity-60"
              >
                {busy === 'import' && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                {tr('Nhập dữ liệu')}
              </button>
            </div>
          </>
        )}
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
      notify({ message: tr('Đã đăng xuất khỏi mọi thiết bị') });
    } catch (err) {
      notify({ tone: 'error', message: err.message });
      setLoggingOut(false);
    }
  };

  return (
    <RisePage className="mx-auto max-w-3xl space-y-3.5">
      <motion.div variants={riseItem}>
        <h1 className="font-display text-2xl font-bold tracking-tight">{tr('Tài khoản')}</h1>
        <p className="mt-1 text-[13px] text-muted">{tr('Quản lý hồ sơ, mật khẩu và phiên đăng nhập của bạn.')}</p>
      </motion.div>

      {locked && (
        <motion.p variants={riseItem} className="tone-warning flex items-start gap-2.5 rounded-2xl px-4 py-3 text-[13px] font-medium">
          <ShieldAlert className="mt-px size-4 shrink-0" aria-hidden="true" />
          {tr('Đây là tài khoản demo dùng chung nên không đổi được hồ sơ, mật khẩu hay xoá tài khoản. Hãy đăng ký tài khoản riêng để dùng đầy đủ.')}
        </motion.p>
      )}

      <Section icon={UserRound} title={tr('Hồ sơ')} description={tr('Tên, ảnh đại diện và màu nhấn của bạn.')}>
        <ProfileForm user={user} locked={locked} />
      </Section>

      <Section icon={Languages} title={tr('Ngôn ngữ')} description={tr('Chọn ngôn ngữ hiển thị. Trang sẽ tải lại để áp dụng.')}>
        <div role="radiogroup" aria-label={tr('Ngôn ngữ')} className="flex flex-wrap gap-2">
          {LANGS.map((l) => {
            const active = l.code === lang;
            return (
              <button
                key={l.code}
                type="button"
                role="radio"
                aria-checked={active}
                lang={l.code}
                onClick={() => setLang(l.code)}
                className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-[13px] font-semibold transition-colors ${
                  active ? 'border-accent bg-accent-soft text-ink' : 'border-line text-muted hover:bg-surface-2 hover:text-ink'
                }`}
              >
                <span className="rounded-md bg-surface-3 px-1.5 text-[11px] font-bold text-muted">{l.short}</span>
                {l.label}
                {active && <Check className="size-4 text-accent-hi" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </Section>

      {user.hasPassword === false ? (
        <Section
          icon={KeyRound}
          title={tr('Đặt mật khẩu')}
          description={tr('Bạn đang đăng nhập bằng Google. Đặt thêm mật khẩu để đăng nhập được bằng email khi cần.')}
        >
          <PasswordForm locked={locked} firstTime />
        </Section>
      ) : (
        <Section icon={KeyRound} title={tr('Đổi mật khẩu')} description={tr('Sau khi đổi, các thiết bị khác sẽ phải đăng nhập lại.')}>
          <PasswordForm locked={locked} />
        </Section>
      )}

      <Section icon={DatabaseBackup} title={tr('Dữ liệu của bạn')} description={tr('Tải dữ liệu về máy để sao lưu, hoặc nhập lại từ file đã tải.')}>
        <DataSection locked={locked} />
      </Section>

      <Section icon={MonitorSmartphone} title={tr('Phiên đăng nhập')} description={tr('Đăng xuất ở máy này, hoặc ở mọi nơi bạn từng đăng nhập.')}>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              logout();
              notify({ message: tr('Đã đăng xuất') });
            }}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-line px-4 text-[13px] font-semibold hover:bg-surface-2"
          >
            <LogOut className="size-4" aria-hidden="true" /> {tr('Đăng xuất')}
          </button>
          <button
            type="button"
            onClick={logoutAll}
            disabled={locked || loggingOut}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-line px-4 text-[13px] font-semibold hover:bg-surface-2 disabled:opacity-50"
          >
            {loggingOut ? <LoaderCircle className="size-4 animate-spin" /> : <MonitorSmartphone className="size-4" aria-hidden="true" />}
            {tr('Đăng xuất mọi thiết bị')}
          </button>
        </div>
      </Section>

      <Section icon={Info} title={tr('Về TaskFlow')} description={tr('Phiên bản {version}', { version: APP_VERSION })}>
        <p className="text-[13px] leading-relaxed text-muted">
          {tr('TaskFlow là đồ án cá nhân của')}{' '}
          <a href={AUTHOR.url} target="_blank" rel="noreferrer" className="font-semibold text-ink underline-offset-4 hover:underline">
            {AUTHOR.name}
          </a>
          {tr(', làm bằng React, Express và MongoDB. Bạn gặp lỗi hoặc muốn góp ý thì cứ mở một issue trên GitHub nhé.')}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-line px-4 text-[13px] font-semibold hover:bg-surface-2"
          >
            <GithubMark /> {tr('Mã nguồn trên GitHub')}
          </a>
          <a
            href={ISSUES_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-line px-4 text-[13px] font-semibold hover:bg-surface-2"
          >
            <Bug className="size-4" aria-hidden="true" /> {tr('Báo lỗi hoặc góp ý')}
          </a>
          {user.role === 'admin' && ADMIN_URL && (
            <a
              href={ADMIN_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-line px-4 text-[13px] font-semibold hover:bg-surface-2"
            >
              <ShieldCheck className="size-4 text-warning" aria-hidden="true" /> {tr('Trang quản trị')}
            </a>
          )}
        </div>
      </Section>

      <Section icon={Trash2} tone="danger" title={tr('Xoá tài khoản')} description={tr('Xoá vĩnh viễn tài khoản và toàn bộ dữ liệu.')}>
        <DeleteAccount locked={locked} />
      </Section>
    </RisePage>
  );
}

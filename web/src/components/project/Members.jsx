import { Crown, LoaderCircle, LogOut, MailPlus, UserPlus, Users, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useMemberActions, useMembers } from '../../hooks/queries.js';
import { relativeTime } from '../../lib/dates.js';
import { tr } from '../../lib/i18n.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Avatar } from '../auth/Fields.jsx';
import { ConfirmDialog, Dialog } from '../ui/Overlay.jsx';
import { useToast } from '../ui/Toasts.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Chồng ảnh đại diện của chủ dự án và thành viên. */
export function AvatarStack({ project, size = 26, max = 4, className = '' }) {
  const people = [project.ownerInfo, ...(project.members || [])].filter(Boolean);
  if (people.length < 2) return null;
  const shown = people.slice(0, max);
  const more = people.length - shown.length;
  return (
    <span className={`flex items-center ${className}`} title={people.map((p) => p.name).join(', ')}>
      <span className="sr-only">{tr('{n} người trong dự án', { n: people.length })}</span>
      {shown.map((p, i) => (
        <span key={p._id} className="rounded-full ring-2 ring-surface" style={{ marginLeft: i ? -size * 0.3 : 0, zIndex: shown.length - i }}>
          <Avatar user={p} size={size} />
        </span>
      ))}
      {more > 0 && (
        <span
          className="grid place-items-center rounded-full bg-surface-3 text-[10px] font-bold text-muted ring-2 ring-surface"
          style={{ width: size, height: size, marginLeft: -size * 0.3 }}
          aria-hidden="true"
        >
          +{more}
        </span>
      )}
    </span>
  );
}

function PersonRow({ person, badge, action }) {
  return (
    <motion.li layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 24 }} className="flex items-center gap-3 py-2.5">
      {person.name ? (
        <Avatar user={person} size={34} />
      ) : (
        <span className="grid size-[34px] shrink-0 place-items-center rounded-full border border-dashed border-line-strong text-faint">
          <MailPlus className="size-4" aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold">{person.name || person.email}</p>
        {person.name && person.email && <p className="truncate text-xs text-muted">{person.email}</p>}
        {!person.name && person.invitedAt && <p className="text-xs text-faint">{tr('Đã mời {time}', { time: relativeTime(person.invitedAt) })}</p>}
      </div>
      {badge}
      {action}
    </motion.li>
  );
}

/** Hộp thoại chia sẻ: chủ dự án mời và xoá người, thành viên xem danh sách hoặc rời dự án. */
export function ShareDialog({ project, open, onClose }) {
  const { user } = useAuth();
  const notify = useToast();
  const navigate = useNavigate();
  const { data, isLoading } = useMembers(project._id, open);
  const { invite, remove, cancel } = useMemberActions(project._id);
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const owner = project.role === 'owner';

  const submit = (e) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) return setError(tr('Email không hợp lệ'));
    setError(null);
    invite.mutate(value, {
      onSuccess: (res) => {
        setEmail('');
        if (res.result === 'added') notify({ tone: 'success', message: tr('Đã thêm {email} vào dự án', { email: value }) });
        else notify({ tone: 'success', message: tr('Đã mời {email}. Họ sẽ vào dự án khi đăng ký bằng email này.', { email: value }) });
        if (!res.emailSent) notify({ message: tr('Máy chủ chưa gửi được email, hãy tự báo cho họ nhé.') });
      },
      onError: (err) => setError(err.fields?.email || err.message),
    });
  };

  const leave = () =>
    remove.mutate(user._id, {
      onSuccess: () => {
        onClose();
        notify({ message: tr('Đã rời dự án “{name}”', { name: project.name }) });
        navigate('/projects');
      },
      onError: (err) => notify({ tone: 'error', message: err.message }),
    });

  const iconButton = 'grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger disabled:opacity-40';

  return (
    <>
      <Dialog open={open} onClose={onClose} title={tr('Chia sẻ “{name}”', { name: project.name })} labelId="share-title" width="sm:max-w-lg">
        <button
          type="button"
          onClick={onClose}
          aria-label={tr('Đóng')}
          className="absolute top-4 right-4 grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink"
        >
          <X className="size-4" />
        </button>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          {owner
            ? tr('Người được mời xem và sửa được công việc, bình luận, tải ảnh. Chỉ bạn sửa được thông tin dự án và quản lý thành viên.')
            : tr('Bạn là thành viên của dự án này. Chủ dự án quản lý danh sách thành viên.')}
        </p>

        {owner && (
          <form onSubmit={submit} noValidate className="mt-4">
            <label htmlFor="invite-email" className="text-[13px] font-semibold">
              {tr('Mời bằng email')}
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                id="invite-email"
                type="email"
                inputMode="email"
                autoComplete="off"
                placeholder="ban@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                aria-invalid={!!error}
                aria-describedby={error ? 'invite-error' : undefined}
                className={`h-10 min-w-0 flex-1 rounded-xl border bg-surface-2/60 px-3 text-[13px] outline-none placeholder:text-faint focus:ring-4 ${
                  error ? 'border-danger/70 focus:ring-danger/15' : 'border-line focus:border-accent/70 focus:ring-accent/15'
                }`}
              />
              <button
                type="submit"
                disabled={invite.isPending || !email.trim()}
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-accent px-4 text-[13px] font-semibold text-white hover:brightness-110 disabled:opacity-60"
              >
                {invite.isPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <UserPlus className="size-4" aria-hidden="true" />}
                {tr('Mời')}
              </button>
            </div>
            {error && (
              <p id="invite-error" role="alert" className="mt-1.5 text-xs font-medium text-danger">
                {error}
              </p>
            )}
          </form>
        )}

        <div className="mt-5">
          <h3 className="flex items-center gap-2 text-xs font-semibold text-faint">
            <Users className="size-3.5" aria-hidden="true" /> {tr('Người trong dự án')}
          </h3>
          {isLoading || !data ? (
            <div className="grid h-24 place-items-center text-muted">
              <LoaderCircle className="size-5 animate-spin" aria-label={tr('Đang tải')} />
            </div>
          ) : (
            <ul className="mt-1 divide-y divide-line/60">
              <AnimatePresence initial={false}>
                {data.owner && (
                  <PersonRow
                    key="owner"
                    person={data.owner}
                    badge={
                      <span className="tone-warning inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                        <Crown className="size-3" aria-hidden="true" /> {tr('Chủ dự án')}
                      </span>
                    }
                  />
                )}
                {data.members.map((m) => {
                  const me = m._id === user._id;
                  return (
                    <PersonRow
                      key={m._id}
                      person={m}
                      badge={me ? <span className="tone-accent rounded-full px-2 py-0.5 text-[11px] font-semibold">{tr('Bạn')}</span> : null}
                      action={
                        owner ? (
                          <button
                            type="button"
                            className={iconButton}
                            onClick={() => setConfirm({ kind: 'remove', person: m })}
                            aria-label={tr('Xoá {name} khỏi dự án', { name: m.name })}
                            title={tr('Xoá khỏi dự án')}
                          >
                            <X className="size-4" />
                          </button>
                        ) : me ? (
                          <button
                            type="button"
                            onClick={() => setConfirm({ kind: 'leave' })}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-danger hover:bg-danger/10"
                          >
                            <LogOut className="size-3.5" aria-hidden="true" /> {tr('Rời dự án')}
                          </button>
                        ) : null
                      }
                    />
                  );
                })}
                {data.invites.map((i) => (
                  <PersonRow
                    key={i.email}
                    person={i}
                    badge={<span className="tone-muted rounded-full px-2 py-0.5 text-[11px] font-semibold">{tr('Đang chờ')}</span>}
                    action={
                      <button
                        type="button"
                        className={iconButton}
                        disabled={cancel.isPending}
                        onClick={() =>
                          cancel.mutate(i.email, {
                            onSuccess: () => notify({ message: tr('Đã huỷ lời mời {email}', { email: i.email }) }),
                            onError: (err) => notify({ tone: 'error', message: err.message }),
                          })
                        }
                        aria-label={tr('Huỷ lời mời {email}', { email: i.email })}
                        title={tr('Huỷ lời mời')}
                      >
                        <X className="size-4" />
                      </button>
                    }
                  />
                ))}
              </AnimatePresence>
              {data.members.length === 0 && data.invites.length === 0 && (
                <li className="py-4 text-center text-[13px] text-faint">{tr('Chưa mời ai. Nhập email ở trên để cùng làm dự án này.')}</li>
              )}
            </ul>
          )}
        </div>
      </Dialog>

      <ConfirmDialog
        open={confirm?.kind === 'remove'}
        onClose={() => setConfirm(null)}
        title={tr('Xoá {name} khỏi dự án?', { name: confirm?.person?.name })}
        body={tr('Người này sẽ không xem được dự án nữa. Công việc và bình luận họ đã tạo vẫn được giữ lại.')}
        confirmLabel={tr('Xoá khỏi dự án')}
        onConfirm={() =>
          remove.mutate(confirm.person._id, {
            onSuccess: () => notify({ message: tr('Đã xoá {name} khỏi dự án', { name: confirm.person.name }) }),
            onError: (err) => notify({ tone: 'error', message: err.message }),
          })
        }
      />
      <ConfirmDialog
        open={confirm?.kind === 'leave'}
        onClose={() => setConfirm(null)}
        title={tr('Rời dự án “{name}”?', { name: project.name })}
        body={tr('Bạn sẽ không xem được dự án này nữa cho tới khi chủ dự án mời lại.')}
        confirmLabel={tr('Rời dự án')}
        onConfirm={leave}
      />
    </>
  );
}

/** Nút chia sẻ kèm chồng ảnh đại diện, dùng ở đầu trang dự án. */
export function ShareButton({ project, className = '' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface/70 px-3 text-[13px] font-semibold backdrop-blur hover:bg-surface-2 ${className}`}
        aria-label={project.role === 'owner' ? tr('Chia sẻ dự án') : tr('Thành viên dự án')}
      >
        <AvatarStack project={project} size={22} max={3} />
        <UserPlus className="size-4 text-muted" aria-hidden="true" />
        <span className="hidden sm:inline">{project.role === 'owner' ? tr('Chia sẻ') : tr('Thành viên')}</span>
      </button>
      <ShareDialog project={project} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

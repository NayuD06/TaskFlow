import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Lock, LockOpen, MoreHorizontal, Shield, ShieldOff, Trash2, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth.jsx';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Empty,
  ErrorBox,
  PageHeader,
  SearchInput,
  Segmented,
  Spinner,
  useDebounced,
  useToast,
} from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { ago, dateShort, dateTime, num } from '../lib/format.js';

const FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'admin', label: 'Quản trị' },
  { value: 'disabled', label: 'Bị khoá' },
  { value: 'google', label: 'Google' },
  { value: 'demo', label: 'Demo' },
];
const SORTS = [
  { value: 'newest', label: 'Mới đăng ký' },
  { value: 'active', label: 'Đăng nhập gần đây' },
  { value: 'name', label: 'Tên A đến Z' },
];
const LIMIT = 20;

function UserBadges({ u, me }) {
  return (
    <span className="flex flex-wrap gap-1">
      {u._id === me && <Badge tone="accent">Bạn</Badge>}
      {u.role === 'admin' && (
        <Badge tone="warning" title={u.envAdmin ? 'Quản trị viên qua biến ADMIN_EMAILS' : undefined}>
          <Shield className="size-3" aria-hidden="true" />
          Admin{u.envAdmin ? ' (ADMIN_EMAILS)' : ''}
        </Badge>
      )}
      {u.disabled && (
        <Badge tone="danger">
          <Lock className="size-3" aria-hidden="true" />
          Bị khoá
        </Badge>
      )}
      {u.isDemo && <Badge>Demo</Badge>}
      {u.google && <Badge>Google</Badge>}
    </span>
  );
}

/** Menu thao tác cho một người dùng. */
function Actions({ u, me, onAction }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const key = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', key);
    };
  }, [open]);
  const self = u._id === me;
  const locked = self || u.envAdmin;
  const reason = self ? 'Không thao tác được trên chính bạn' : u.envAdmin ? 'Quản trị viên qua ADMIN_EMAILS: sửa biến môi trường để đổi' : '';
  const item =
    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] hover:bg-surface-3 disabled:opacity-40 disabled:hover:bg-transparent';
  const pick = (action) => {
    setOpen(false);
    onAction(action, u);
  };
  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Thao tác với ${u.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title={reason || undefined}
      >
        <MoreHorizontal className="size-4" aria-hidden="true" />
      </Button>
      {open && (
        <div role="menu" className="rise absolute right-0 z-30 mt-1 w-56 rounded-xl border border-line bg-surface p-1 shadow-lift">
          {reason && <p className="px-3 py-2 text-[12px] text-muted">{reason}</p>}
          <button role="menuitem" type="button" className={item} disabled={locked} onClick={() => pick(u.disabled ? 'unlock' : 'lock')}>
            {u.disabled ? <LockOpen className="size-4" aria-hidden="true" /> : <Lock className="size-4" aria-hidden="true" />}
            {u.disabled ? 'Mở khoá tài khoản' : 'Khoá tài khoản'}
          </button>
          <button role="menuitem" type="button" className={item} disabled={locked} onClick={() => pick(u.role === 'admin' ? 'demote' : 'promote')}>
            {u.role === 'admin' ? <ShieldOff className="size-4" aria-hidden="true" /> : <Shield className="size-4" aria-hidden="true" />}
            {u.role === 'admin' ? 'Bỏ quyền quản trị' : 'Cấp quyền quản trị'}
          </button>
          <button role="menuitem" type="button" className={`${item} text-danger`} disabled={locked || u.isDemo} onClick={() => pick('delete')}>
            <Trash2 className="size-4" aria-hidden="true" />
            Xoá tài khoản
          </button>
        </div>
      )}
    </div>
  );
}

const CONFIRM = {
  lock: (u) => ({
    title: `Khoá tài khoản ${u.name}?`,
    description: 'Họ bị đăng xuất khỏi mọi thiết bị và không đăng nhập lại được cho tới khi bạn mở khoá. Dữ liệu vẫn được giữ nguyên.',
    label: 'Khoá tài khoản',
    danger: true,
  }),
  unlock: (u) => ({ title: `Mở khoá ${u.name}?`, description: 'Họ đăng nhập lại được bằng mật khẩu hoặc Google như bình thường.', label: 'Mở khoá' }),
  promote: (u) => ({
    title: `Cấp quyền quản trị cho ${u.name}?`,
    description: 'Họ sẽ vào được trang này: xem mọi người dùng, khoá tài khoản và xoá ảnh. Chỉ cấp cho người bạn tin tưởng.',
    label: 'Cấp quyền',
  }),
  demote: (u) => ({
    title: `Bỏ quyền quản trị của ${u.name}?`,
    description: 'Họ vẫn dùng TaskFlow bình thường nhưng không vào được trang quản trị nữa.',
    label: 'Bỏ quyền',
    danger: true,
  }),
  delete: (u) => ({
    title: `Xoá vĩnh viễn ${u.name}?`,
    description: `Xoá tài khoản cùng ${u.projects} dự án và ${u.tasks} công việc của họ. Họ cũng rời khỏi các dự án được chia sẻ. Không hoàn tác được.`,
    label: 'Xoá vĩnh viễn',
    danger: true,
    confirmText: u.email,
  }),
};

export default function Users() {
  const { user: me } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState(null);
  const q = useDebounced(search);
  useEffect(() => setPage(1), [q, filter, sort]);

  const list = useQuery({
    queryKey: ['admin-users', { q, filter, sort, page }],
    queryFn: () => api.users({ q, filter, sort, page, limit: LIMIT }),
    placeholderData: keepPreviousData,
  });

  const act = useMutation({
    mutationFn: ({ action, u }) => {
      if (action === 'delete') return api.deleteUser(u._id);
      const body = { lock: { disabled: true }, unlock: { disabled: false }, promote: { role: 'admin' }, demote: { role: 'user' } }[action];
      return api.updateUser(u._id, body);
    },
    onSuccess: (_, { action, u }) => {
      const done = {
        lock: `Đã khoá ${u.name}`,
        unlock: `Đã mở khoá ${u.name}`,
        promote: `${u.name} giờ là quản trị viên`,
        demote: `Đã bỏ quyền quản trị của ${u.name}`,
        delete: `Đã xoá tài khoản ${u.email}`,
      };
      toast(done[action]);
      setPending(null);
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err) => toast(err.fields ? Object.values(err.fields)[0] : err.message, 'error'),
  });

  const data = list.data?.data || [];
  const total = list.data?.total || 0;
  const from = total ? (page - 1) * LIMIT + 1 : 0;
  const to = Math.min(page * LIMIT, total);
  const confirm = pending && CONFIRM[pending.action](pending.u);

  return (
    <div className="space-y-4">
      <PageHeader title="Người dùng" description={list.data ? `${num(total)} tài khoản khớp bộ lọc` : 'Tài khoản đã đăng ký TaskFlow'} />

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Tìm theo tên hoặc email" />
        <Segmented value={filter} onChange={setFilter} options={FILTERS} label="Lọc người dùng" />
        <label className="ml-auto flex items-center gap-2 text-[13px] text-muted">
          Sắp xếp
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-10 rounded-xl border border-line bg-surface px-3 text-[13px] text-ink outline-none focus:border-accent"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {list.isError && <ErrorBox error={list.error} onRetry={list.refetch} />}
      <Card className="overflow-hidden">
        {list.isPending ? (
          <Spinner />
        ) : !data.length ? (
          <Empty icon={UserRound} title="Không có ai khớp bộ lọc">
            Thử bỏ bớt điều kiện tìm kiếm.
          </Empty>
        ) : (
          <>
            {/* Bảng cho màn hình rộng */}
            <table className={`hidden w-full text-left text-[13px] md:table ${list.isFetching ? 'opacity-70' : ''}`}>
              <thead className="border-b border-line bg-surface-2 text-[12px] text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-semibold">
                    Người dùng
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                    Dự án
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                    Công việc
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">
                    Đăng ký
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">
                    Đăng nhập gần nhất
                  </th>
                  <th scope="col" className="w-12 px-3 py-2.5">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.map((u) => (
                  <tr key={u._id} className={u.disabled ? 'bg-surface-2/60' : ''}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar user={u} size={36} />
                        <div className="min-w-0">
                          <p className={`truncate font-semibold ${u.disabled ? 'text-muted line-through' : ''}`}>{u.name}</p>
                          <p className="truncate text-[12px] text-muted">{u.email}</p>
                          <div className="mt-1">
                            <UserBadges u={u} me={me?._id} />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{num(u.projects)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{num(u.tasks)}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-muted">
                      <time dateTime={u.createdAt}>{dateShort(u.createdAt)}</time>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-muted" title={dateTime(u.lastLoginAt)}>
                      {ago(u.lastLoginAt)}
                    </td>
                    <td className="px-3 py-3">
                      <Actions u={u} me={me?._id} onAction={(action, target) => setPending({ action, u: target })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Thẻ cho điện thoại */}
            <ul className="divide-y divide-line md:hidden">
              {data.map((u) => (
                <li key={u._id} className="flex items-start gap-3 p-3.5">
                  <Avatar user={u} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate font-semibold ${u.disabled ? 'text-muted line-through' : ''}`}>{u.name}</p>
                    <p className="truncate text-[12px] text-muted">{u.email}</p>
                    <div className="mt-1.5">
                      <UserBadges u={u} me={me?._id} />
                    </div>
                    <p className="mt-1.5 text-[12px] text-muted">
                      {num(u.projects)} dự án · {num(u.tasks)} việc · đăng nhập {ago(u.lastLoginAt).toLowerCase()}
                    </p>
                  </div>
                  <Actions u={u} me={me?._id} onAction={(action, target) => setPending({ action, u: target })} />
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-[13px] text-muted">
              <span>
                {num(from)} đến {num(to)} trong {num(total)}
              </span>
              <div className="flex gap-1.5">
                <Button size="icon" onClick={() => setPage((p) => p - 1)} disabled={page <= 1} aria-label="Trang trước">
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </Button>
                <Button size="icon" onClick={() => setPage((p) => p + 1)} disabled={to >= total} aria-label="Trang sau">
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <ConfirmDialog
        open={!!pending}
        onClose={() => !act.isPending && setPending(null)}
        onConfirm={() => act.mutate(pending)}
        title={confirm?.title}
        description={confirm?.description}
        confirmLabel={confirm?.label}
        danger={confirm?.danger}
        confirmText={confirm?.confirmText}
        loading={act.isPending}
      />
    </div>
  );
}

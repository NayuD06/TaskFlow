import { useQuery } from '@tanstack/react-query';
import { Activity, CheckCircle2, CircleDashed, FolderKanban, Image, ListChecks, MessageSquare, RefreshCw, Timer, Users } from 'lucide-react';
import { Link } from 'react-router';
import { useAuth } from '../auth.jsx';
import BarChart from '../components/BarChart.jsx';
import { Badge, Button, Card, ErrorBox, PageHeader, Spinner } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { HUES, ago, bytes, num } from '../lib/format.js';

function Stat({ icon: Icon, label, value, note, to }) {
  const body = (
    <>
      <span className="flex items-center gap-2 text-[12.5px] font-medium text-muted">
        <Icon className="size-4" aria-hidden="true" />
        {label}
      </span>
      <span className="mt-2 block font-display text-[26px] leading-none font-bold tracking-tight">{value}</span>
      {note && <span className="mt-2 block text-[12px] text-muted">{note}</span>}
    </>
  );
  const cls = 'block rounded-2xl border border-line bg-surface p-4 transition-colors';
  return to ? (
    <Link to={to} className={`${cls} hover:border-line-strong hover:bg-surface-2`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

const INTEGRATIONS = [
  { key: 'mail', label: 'Gửi email', on: 'Quên mật khẩu, lời mời vào dự án', off: 'Đặt MAIL_FROM và BREVO_API_KEY (hoặc RESEND_API_KEY)' },
  { key: 'google', label: 'Đăng nhập Google', on: 'Nút Google đang hiện ở trang đăng nhập', off: 'Đặt GOOGLE_CLIENT_ID' },
  { key: 'uploads', label: 'Tải ảnh lên Cloudinary', on: 'Ảnh đính kèm và ảnh đại diện', off: 'Đặt CLOUDINARY_CLOUD_NAME và CLOUDINARY_UPLOAD_PRESET' },
  {
    key: 'cloudinaryAdmin',
    label: 'Quản lý ảnh Cloudinary',
    on: 'Trang Ảnh Cloudinary xem và xoá được ảnh',
    off: 'Đặt CLOUDINARY_API_KEY và CLOUDINARY_API_SECRET',
  },
  { key: 'sentry', label: 'Báo lỗi Sentry', on: 'Lỗi máy chủ được gửi lên Sentry', off: 'Đặt SENTRY_DSN' },
];

const VERB = {
  task_created: 'đã tạo',
  task_completed: 'đã hoàn thành',
  task_reopened: 'đã mở lại',
  task_moved: 'đã chuyển',
  task_deleted: 'đã xoá',
  project_created: 'đã tạo dự án',
  task_commented: 'đã bình luận về',
  pomodoro_completed: 'đã tập trung cho',
  member_joined: 'đã tham gia dự án',
};

function ActivityList() {
  const q = useQuery({ queryKey: ['admin-activity'], queryFn: () => api.activity(12) });
  if (q.isPending) return <Spinner />;
  if (q.isError) return <ErrorBox error={q.error} onRetry={q.refetch} />;
  if (!q.data.length) return <p className="py-8 text-center text-[13px] text-muted">Chưa có hoạt động nào.</p>;
  return (
    <ol className="divide-y divide-line">
      {q.data.map((a) => {
        const projectLevel = a.type === 'project_created' || a.type === 'member_joined';
        return (
          <li key={a._id} className="flex items-start gap-3 py-2.5">
            <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: HUES[a.projectColor] || HUES.blue }} aria-hidden="true" />
            <p className="min-w-0 flex-1 text-[13px] leading-snug">
              <b className="font-semibold">{a.actorName || 'Ai đó'}</b> <span className="text-muted">{VERB[a.type] || a.type}</span>{' '}
              <span className="font-medium">{projectLevel ? a.projectName : a.taskTitle}</span>
              {a.type === 'pomodoro_completed' && a.to && <span className="text-muted"> ({a.to} phút)</span>}
              {!projectLevel && a.projectName && <span className="text-muted"> · {a.projectName}</span>}
            </p>
            <time className="shrink-0 text-[12px] text-faint" dateTime={a.createdAt}>
              {ago(a.createdAt)}
            </time>
          </li>
        );
      })}
    </ol>
  );
}

export default function Overview() {
  const { user } = useAuth();
  const q = useQuery({ queryKey: ['admin-stats'], queryFn: api.stats });
  const s = q.data;
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

  return (
    <div className="space-y-5">
      <PageHeader title={`Chào ${user?.name?.split(' ').pop() || 'bạn'}`} description="Tình hình TaskFlow hôm nay.">
        <Button size="sm" onClick={() => q.refetch()} loading={q.isFetching && !q.isPending}>
          {!(q.isFetching && !q.isPending) && <RefreshCw className="size-4" aria-hidden="true" />}
          Làm mới
        </Button>
      </PageHeader>

      {q.isPending && <Spinner />}
      {q.isError && <ErrorBox error={q.error} onRetry={q.refetch} />}
      {s && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            <Stat
              icon={Users}
              label="Người dùng"
              value={num(s.users.total)}
              note={`+${num(s.users.new7d)} tuần này · ${num(s.users.google)} qua Google`}
              to="/users"
            />
            <Stat
              icon={Activity}
              label="Hoạt động 7 ngày"
              value={num(s.users.active7d)}
              note={`${pct(s.users.active7d, s.users.total)}% người dùng có đăng nhập`}
            />
            <Stat icon={FolderKanban} label="Dự án" value={num(s.projects.total)} note={`${num(s.projects.shared)} dự án đang chia sẻ`} />
            <Stat
              icon={ListChecks}
              label="Công việc"
              value={num(s.tasks.total)}
              note={`${pct(s.tasks.done, s.tasks.total)}% đã xong · ${num(s.tasks.overdue)} trễ hạn`}
            />
            <Stat icon={MessageSquare} label="Bình luận" value={num(s.comments)} note={`${num(s.tasks.recurring)} việc lặp lại`} />
            <Stat icon={Image} label="Ảnh đính kèm" value={num(s.images.total)} note={bytes(s.images.bytes)} to="/images" />
            <Stat icon={Timer} label="Pomodoro" value={num(s.focus.pomodoros)} note={`${num(Math.round(s.focus.minutes / 60))} giờ tập trung`} />
            <Stat
              icon={Users}
              label="Quản trị viên"
              value={num(s.users.admins)}
              note={s.users.disabled ? `${num(s.users.disabled)} tài khoản bị khoá` : 'Không ai bị khoá'}
              to="/users"
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card className="p-4 sm:p-5">
              <BarChart title="Người đăng ký mới" days={s.days} field="signups" unit="người" />
            </Card>
            <Card className="p-4 sm:p-5">
              <BarChart title="Công việc hoàn thành" days={s.days} field="completed" unit="việc" color="var(--success)" />
            </Card>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <Card className="p-4 sm:p-5">
              <h2 className="text-[15px] font-bold">Tính năng trên máy chủ</h2>
              <p className="mt-0.5 text-[12.5px] text-muted">Đọc từ biến môi trường trên Render. Thiếu biến nào thì tính năng đó tự ẩn.</p>
              <ul className="mt-3 space-y-2.5">
                {INTEGRATIONS.map((it) => {
                  const on = s.integrations[it.key];
                  return (
                    <li key={it.key} className="flex items-start gap-2.5">
                      {on ? (
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                      ) : (
                        <CircleDashed className="mt-0.5 size-4 shrink-0 text-faint" aria-hidden="true" />
                      )}
                      <div className="min-w-0 text-[13px]">
                        <p className="font-semibold">
                          {it.label}{' '}
                          <Badge tone={on ? 'success' : 'muted'} className="ml-1 align-middle">
                            {on ? 'Đang bật' : 'Chưa bật'}
                          </Badge>
                        </p>
                        <p className="text-[12.5px] text-muted">{on ? it.on : it.off}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
            <Card className="p-4 sm:p-5">
              <h2 className="text-[15px] font-bold">Hoạt động mới nhất</h2>
              <p className="mt-0.5 text-[12.5px] text-muted">Của mọi người dùng trên hệ thống.</p>
              <div className="mt-2">
                <ActivityList />
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

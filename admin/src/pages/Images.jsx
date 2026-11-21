import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  Copy,
  ExternalLink,
  HardDrive,
  ImageOff,
  Images as ImagesIcon,
  KeyRound,
  ListChecks,
  RefreshCw,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Dialog,
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
import { HUES, ago, bytes, dateTime, num, thumb } from '../lib/format.js';

const LIMIT = 48;
const KINDS = [
  { value: 'all', label: 'Mọi loại ảnh' },
  { value: 'tasks', label: 'Ảnh công việc' },
  { value: 'avatars', label: 'Ảnh đại diện' },
  { value: 'other', label: 'Thư mục khác' },
];

function Usage({ usage, compact = false }) {
  if (!usage.length) return <p className="text-[12px] text-warning">Không còn được dùng ở đâu</p>;
  const shown = compact ? usage.slice(0, 1) : usage;
  return (
    <ul className="space-y-1">
      {shown.map((u, i) => (
        <li key={i} className="flex min-w-0 items-center gap-1.5 text-[12px]">
          {u.kind === 'task' ? (
            <>
              <span className="size-2 shrink-0 rounded-full" style={{ background: HUES[u.projectColor] || HUES.blue }} aria-hidden="true" />
              <span className="min-w-0 truncate">
                <span className="font-medium">{u.title}</span>
                <span className="text-muted">
                  {' '}
                  · {u.projectName}
                  {!compact && u.ownerName ? ` · của ${u.ownerName}` : ''}
                </span>
              </span>
            </>
          ) : (
            <>
              <UserRound className="size-3.5 shrink-0 text-muted" aria-hidden="true" />
              <span className="min-w-0 truncate">
                Ảnh đại diện của <span className="font-medium">{u.name}</span>
                {!compact && <span className="text-muted"> ({u.email})</span>}
              </span>
            </>
          )}
        </li>
      ))}
      {compact && usage.length > 1 && <li className="text-[12px] text-muted">và {usage.length - 1} chỗ khác</li>}
    </ul>
  );
}

function ImageCard({ img, selected, onToggle, onOpen }) {
  const used = img.usage.length > 0;
  return (
    <li
      className={`group relative overflow-hidden rounded-2xl border bg-surface transition-colors ${selected ? 'border-accent ring-2 ring-accent/40' : 'border-line hover:border-line-strong'}`}
    >
      <button type="button" onClick={() => onOpen(img)} className="checker block aspect-[4/3] w-full overflow-hidden" aria-label={`Xem ảnh ${img.publicId}`}>
        <img
          src={thumb(img.url, 480, 360)}
          alt=""
          loading="lazy"
          className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </button>
      <label
        className={`absolute top-2 left-2 grid size-7 cursor-pointer place-items-center rounded-lg border shadow-sm transition ${
          selected ? 'border-accent bg-accent text-white' : 'border-white/80 bg-black/55 text-transparent backdrop-blur-sm hover:text-white/80'
        }`}
      >
        <input type="checkbox" className="sr-only" checked={selected} onChange={() => onToggle(img)} aria-label={`Chọn ảnh ${img.publicId}`} />
        <Check className="size-4" strokeWidth={3} aria-hidden="true" />
      </label>
      <span className="absolute top-2 right-2 inline-flex items-center gap-1.5 rounded-full bg-black/65 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm backdrop-blur-sm">
        <span className={`size-1.5 rounded-full ${used ? 'bg-[#2fd29b]' : 'bg-[#f5a524]'}`} aria-hidden="true" />
        {used ? `Đang dùng${img.usage.length > 1 ? ` ×${img.usage.length}` : ''}` : 'Không dùng'}
      </span>
      <div className="p-3">
        <Usage usage={img.usage} compact />
        <p className="mt-1.5 text-[11.5px] text-muted">
          {bytes(img.bytes)} · {img.width}×{img.height} · {ago(img.createdAt)}
        </p>
      </div>
    </li>
  );
}

function Preview({ img, onClose, onDelete }) {
  const toast = useToast();
  const [copied, setCopied] = useState('');
  const copy = async (text, what) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(''), 1500);
    } catch {
      toast('Trình duyệt không cho chép, hãy chép tay nhé', 'error');
    }
  };
  if (!img) return null;
  const rows = [
    ['Thư mục', `taskflow/${img.folder}`],
    ['Kích thước', `${img.width}×${img.height} px`],
    ['Dung lượng', bytes(img.bytes)],
    ['Định dạng', img.format.toUpperCase()],
    ['Tải lên', dateTime(img.createdAt)],
  ];
  return (
    <Dialog open onClose={onClose} title="Chi tiết ảnh" width="max-w-3xl">
      <div className="grid gap-5 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <a href={img.url} target="_blank" rel="noreferrer" className="checker block overflow-hidden rounded-xl ring-1 ring-line" title="Mở ảnh gốc">
          <img src={thumb(img.url, 1200, 900).replace('c_fill', 'c_limit')} alt={img.publicId} className="max-h-[60dvh] w-full object-contain" />
        </a>
        <div className="min-w-0 text-[13px]">
          <p className="text-[12px] font-semibold text-muted">Public ID</p>
          <div className="mt-1 flex items-start gap-1.5">
            <code className="min-w-0 flex-1 rounded-lg bg-surface-2 px-2.5 py-1.5 text-[12px] break-all ring-1 ring-line">{img.publicId}</code>
            <Button size="icon" variant="ghost" onClick={() => copy(img.publicId, 'id')} aria-label="Chép public ID">
              {copied === 'id' ? <Check className="size-4 text-success" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            </Button>
          </div>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
            {rows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted">{k}</dt>
                <dd className="min-w-0 truncate">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-[12px] font-semibold text-muted">Đang dùng ở</p>
          <div className="mt-1.5">
            <Usage usage={img.usage} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => copy(img.url, 'url')}>
              {copied === 'url' ? <Check className="size-4 text-success" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
              Chép link
            </Button>
            <a
              href={img.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-surface-2 px-3 text-[13px] font-semibold ring-1 ring-line hover:bg-surface-3"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              Mở ảnh gốc
            </a>
            <Button size="sm" variant="danger" onClick={() => onDelete([img])}>
              <Trash2 className="size-4" aria-hidden="true" />
              Xoá ảnh
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

function Setup({ cloudName }) {
  const steps = [
    <>
      Đăng nhập <b>cloudinary.com</b>, mở <b>Settings</b> (bánh răng) rồi chọn <b>API Keys</b>.
    </>,
    <>
      Chép <b>API Key</b> và <b>API Secret</b> (bấm vào con mắt để hiện secret).
    </>,
    <>
      Trên Render, mở dịch vụ API, vào <b>Environment</b>, thêm hai biến <code>CLOUDINARY_API_KEY</code> và <code>CLOUDINARY_API_SECRET</code>
      {cloudName ? (
        ''
      ) : (
        <>
          , cùng với <code>CLOUDINARY_CLOUD_NAME</code>
        </>
      )}
      , rồi bấm <b>Save Changes</b>.
    </>,
    <>Đợi Render khởi động lại (khoảng 1 phút) rồi tải lại trang này.</>,
  ];
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-admin/15 text-admin">
          <KeyRound className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[16px] font-bold">Cần khoá Admin API của Cloudinary</h2>
          <p className="mt-1 text-[13px] text-muted">
            Để liệt kê và xoá ảnh, máy chủ cần thêm khoá bí mật của Cloudinary. Khoá này chỉ nằm trên Render, không bao giờ gửi xuống trình duyệt.
          </p>
        </div>
      </div>
      <ol className="mt-5 space-y-3">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3 text-[13px] leading-relaxed">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-3 text-[12px] font-bold">{i + 1}</span>
            <p className="min-w-0 pt-0.5 [&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1 [&_code]:text-ink">{s}</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function UsageBar({ label, part, note }) {
  const pctNum = part?.usedPercent ?? (part?.limit ? (part.usage / part.limit) * 100 : null);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-[12px]">
        <span className="text-muted">{label}</span>
        <span className="font-semibold">{note}</span>
      </div>
      {pctNum !== null && (
        <div
          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3"
          role="progressbar"
          aria-label={label}
          aria-valuenow={Math.round(pctNum)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`h-full rounded-full ${pctNum > 85 ? 'bg-danger' : pctNum > 60 ? 'bg-warning' : 'bg-accent'}`}
            style={{ width: `${Math.min(100, Math.max(2, pctNum))}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function Images() {
  const toast = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [kind, setKind] = useState('all');
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const [selected, setSelected] = useState(() => new Map());
  const [preview, setPreview] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const params = { filter, kind, q };
  const list = useInfiniteQuery({
    queryKey: ['admin-images', params],
    queryFn: ({ pageParam }) => api.images({ ...params, page: pageParam, limit: LIMIT }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.configured && last.page * last.limit < last.total ? last.page + 1 : undefined),
  });
  useEffect(() => setSelected(new Map()), [filter, kind, q]);

  const first = list.data?.pages[0];
  const items = useMemo(() => list.data?.pages.flatMap((p) => p.items) ?? [], [list.data]);
  const totals = first?.totals;
  const usage = first?.usage;

  const refresh = async () => {
    setRefreshing(true);
    try {
      await api.images({ refresh: 1, limit: 1 });
      await qc.invalidateQueries({ queryKey: ['admin-images'] });
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const toggle = (img) =>
    setSelected((m) => {
      const next = new Map(m);
      if (next.has(img.publicId)) next.delete(img.publicId);
      else next.set(img.publicId, img);
      return next;
    });
  const selectedList = [...selected.values()];
  const allShownSelected = items.length > 0 && items.every((i) => selected.has(i.publicId));

  const remove = useMutation({
    mutationFn: ({ images, force }) =>
      api.deleteImages(
        images.map((i) => i.publicId),
        force,
      ),
    onSuccess: (res) => {
      const parts = [`Đã xoá ${num(res.deleted.length)} ảnh`];
      if (res.detached) parts.push(`gỡ khỏi ${num(res.detached)} chỗ trong công việc`);
      if (res.avatarsCleared) parts.push(`đặt lại ${num(res.avatarsCleared)} ảnh đại diện`);
      toast(parts.join(', '));
      setToDelete(null);
      setPreview(null);
      setSelected(new Map());
      qc.invalidateQueries({ queryKey: ['admin-images'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err) => toast(err.message, 'error'),
  });

  const askDelete = (images) => setToDelete(images);
  const cleanUnused = async () => {
    try {
      const all = await api.images({ filter: 'unused', limit: 200 });
      if (!all.items.length) return toast('Không có ảnh nào bị bỏ quên');
      setToDelete(all.items);
    } catch (err) {
      toast(err.message, 'error');
    }
  };
  const deleting = toDelete || [];
  const inUse = deleting.filter((i) => i.usage.length > 0);
  const deletingBytes = deleting.reduce((s, i) => s + i.bytes, 0);

  return (
    <div className="space-y-4">
      <PageHeader title="Ảnh Cloudinary" description="Mọi ảnh TaskFlow đã lưu trong thư mục taskflow/ trên Cloudinary, kèm nơi đang dùng.">
        {first?.configured && (
          <Button size="sm" onClick={refresh} loading={refreshing}>
            {!refreshing && <RefreshCw className="size-4" aria-hidden="true" />}
            Làm mới
          </Button>
        )}
      </PageHeader>

      {list.isPending && <Spinner />}
      {list.isError && <ErrorBox error={list.error} onRetry={list.refetch} />}
      {first && !first.configured && <Setup cloudName={first.cloudName} />}

      {first?.configured && totals && (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Card className="p-4">
              <p className="flex items-center gap-2 text-[12.5px] font-medium text-muted">
                <ImagesIcon className="size-4" aria-hidden="true" /> Tổng số ảnh
              </p>
              <p className="mt-2 font-display text-[26px] leading-none font-bold">{num(totals.count)}</p>
              <p className="mt-2 text-[12px] text-muted">
                {bytes(totals.bytes)} · {num(totals.tasks)} ảnh công việc · {num(totals.avatars)} ảnh đại diện
              </p>
            </Card>
            <Card className="p-4">
              <p className="flex items-center gap-2 text-[12.5px] font-medium text-muted">
                <ListChecks className="size-4" aria-hidden="true" /> Đang được dùng
              </p>
              <p className="mt-2 font-display text-[26px] leading-none font-bold">{num(totals.used)}</p>
              <p className="mt-2 text-[12px] text-muted">Trong thẻ công việc hoặc làm ảnh đại diện</p>
            </Card>
            <Card className="col-span-2 p-4 xl:col-span-1">
              <p className="flex items-center gap-2 text-[12.5px] font-medium text-muted">
                <ImageOff className="size-4" aria-hidden="true" /> Không còn dùng
              </p>
              <p className="mt-2 font-display text-[26px] leading-none font-bold">{num(totals.unused)}</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[12px] text-muted">{bytes(totals.unusedBytes)} có thể dọn</span>
                {totals.unused > 0 && (
                  <Button size="sm" variant="ghost" className="-mr-2 text-warning" onClick={cleanUnused}>
                    <Sparkles className="size-4" aria-hidden="true" />
                    Dọn dẹp
                  </Button>
                )}
              </div>
            </Card>
            <Card className="col-span-2 space-y-2.5 p-4 xl:col-span-1">
              <p className="flex items-center gap-2 text-[12.5px] font-medium text-muted">
                <HardDrive className="size-4" aria-hidden="true" /> Tài khoản Cloudinary
                {usage?.plan && <Badge className="ml-auto">{usage.plan}</Badge>}
              </p>
              {usage ? (
                <>
                  {usage.credits?.limit ? (
                    <UsageBar label="Credits tháng này" part={usage.credits} note={`${usage.credits.usage ?? 0} / ${usage.credits.limit}`} />
                  ) : null}
                  {usage.storage && <UsageBar label="Dung lượng lưu trữ" part={usage.storage} note={bytes(usage.storage.usage)} />}
                  {usage.bandwidth && <UsageBar label="Băng thông" part={usage.bandwidth} note={bytes(usage.bandwidth.usage)} />}
                </>
              ) : (
                <p className="text-[12px] text-muted">Chưa đọc được dung lượng tài khoản.</p>
              )}
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              value={filter}
              onChange={setFilter}
              label="Lọc theo trạng thái"
              options={[
                { value: 'all', label: 'Tất cả', count: totals.count },
                { value: 'used', label: 'Đang dùng', count: totals.used },
                { value: 'unused', label: 'Không dùng', count: totals.unused },
              ]}
            />
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              aria-label="Loại ảnh"
              className="h-10 rounded-xl border border-line bg-surface px-3 text-[13px] outline-none focus:border-accent"
            >
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
            <SearchInput value={search} onChange={setSearch} placeholder="Tìm theo công việc, dự án, người dùng" />
            <span className="ml-auto text-[12px] text-faint">Cập nhật {ago(first.fetchedAt).toLowerCase()}</span>
          </div>
          {first.truncated && <p className="rounded-xl px-3 py-2 text-[12.5px] tone-warning">Có hơn 5.000 ảnh nên chỉ hiện 5.000 ảnh đầu tiên.</p>}

          {items.length === 0 ? (
            <Card>
              <Empty icon={ImageOff} title={totals.count ? 'Không có ảnh nào khớp bộ lọc' : 'Chưa có ảnh nào'}>
                {totals.count ? 'Thử đổi bộ lọc hoặc từ khoá.' : 'Khi người dùng đính kèm ảnh vào công việc hoặc đổi ảnh đại diện, ảnh sẽ hiện ở đây.'}
              </Empty>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between text-[13px] text-muted">
                <span>
                  Đang hiện {num(items.length)} trong {num(first.total)} ảnh
                </span>
                <Button size="sm" variant="ghost" onClick={() => setSelected(allShownSelected ? new Map() : new Map(items.map((i) => [i.publicId, i])))}>
                  {allShownSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả đang hiện'}
                </Button>
              </div>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
                {items.map((img) => (
                  <ImageCard key={img.publicId} img={img} selected={selected.has(img.publicId)} onToggle={toggle} onOpen={setPreview} />
                ))}
              </ul>
              {list.hasNextPage && (
                <div className="flex justify-center">
                  <Button onClick={() => list.fetchNextPage()} loading={list.isFetchingNextPage}>
                    Tải thêm ảnh
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {selectedList.length > 0 && (
        <div className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-lift sm:bottom-5">
          <p className="min-w-0 flex-1 text-[13px]">
            Đã chọn <b>{num(selectedList.length)}</b> ảnh ({bytes(selectedList.reduce((s, i) => s + i.bytes, 0))})
          </p>
          <Button size="icon" variant="ghost" onClick={() => setSelected(new Map())} aria-label="Bỏ chọn">
            <X className="size-4" aria-hidden="true" />
          </Button>
          <Button size="sm" variant="danger" onClick={() => askDelete(selectedList)}>
            <Trash2 className="size-4" aria-hidden="true" />
            Xoá
          </Button>
        </div>
      )}

      <Preview img={preview} onClose={() => setPreview(null)} onDelete={askDelete} />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => !remove.isPending && setToDelete(null)}
        onConfirm={() => remove.mutate({ images: deleting, force: inUse.length > 0 })}
        title={deleting.length === 1 ? 'Xoá ảnh này khỏi Cloudinary?' : `Xoá ${num(deleting.length)} ảnh khỏi Cloudinary?`}
        description={`Giải phóng ${bytes(deletingBytes)}. Ảnh bị xoá vĩnh viễn trên Cloudinary, không khôi phục được.`}
        confirmLabel={inUse.length ? 'Gỡ và xoá' : 'Xoá vĩnh viễn'}
        danger
        loading={remove.isPending}
      >
        {inUse.length > 0 && (
          <div className="rounded-xl p-3 text-[13px] tone-warning">
            <p className="font-semibold">{inUse.length === deleting.length ? 'Ảnh đang được dùng' : `${num(inUse.length)} ảnh đang được dùng`}</p>
            <p className="mt-1 text-ink/80">Ảnh sẽ bị gỡ khỏi thẻ công việc, ảnh đại diện sẽ trở về chữ cái đầu. Người dùng sẽ không thấy ảnh này nữa.</p>
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}

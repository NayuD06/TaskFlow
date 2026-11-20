import { Dialog } from '../ui/Overlay.jsx';
import { useUI } from './UIContext.jsx';
import { tr } from '../../lib/i18n.js';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? '⌘' : 'Ctrl';

const GROUPS = [
  {
    title: tr('Chung'),
    items: [
      { keys: ['N'], label: tr('Thêm việc mới') },
      { keys: ['/'], label: tr('Tìm nhanh công việc, dự án') },
      { keys: [MOD, 'K'], label: tr('Mở hộp tìm nhanh') },
      { keys: [MOD, 'B'], label: tr('Thu gọn hoặc mở thanh bên') },
      { keys: ['?'], label: tr('Xem bảng phím tắt này') },
      { keys: ['Esc'], label: tr('Đóng hộp thoại, bảng chi tiết') },
    ],
  },
  {
    title: tr('Di chuyển'),
    items: [
      { keys: ['G', 'D'], then: true, label: tr('Tới Tổng quan') },
      { keys: ['G', 'P'], then: true, label: tr('Tới Dự án') },
      { keys: ['G', 'M'], then: true, label: tr('Tới Việc của tôi') },
      { keys: ['G', 'S'], then: true, label: tr('Tới Tài khoản') },
    ],
  },
  {
    title: tr('Trên bảng Kanban'),
    items: [
      { keys: ['Tab'], label: tr('Chọn thẻ tiếp theo') },
      { keys: ['Enter'], label: tr('Mở thẻ đang chọn') },
      { keys: ['Space'], label: tr('Nhấc thẻ lên, dùng phím mũi tên để di chuyển') },
    ],
  },
];

function Keys({ keys, then }) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      {keys.map((k, i) => (
        <span key={k} className="flex items-center gap-1">
          {i > 0 && <span className="text-[11px] text-faint">{then ? tr('rồi') : '+'}</span>}
          <kbd className="grid h-6 min-w-6 place-items-center rounded-md border border-line-strong bg-surface-2 px-1.5 font-sans text-[11px] font-semibold text-ink shadow-[0_1px_0_0_var(--line-strong)]">
            {k}
          </kbd>
        </span>
      ))}
    </span>
  );
}

export default function ShortcutsDialog() {
  const { shortcutsOpen, closeShortcuts } = useUI();
  return (
    <Dialog open={shortcutsOpen} onClose={closeShortcuts} title={tr('Phím tắt')} labelId="shortcuts-title" width="sm:max-w-lg">
      <p className="mt-1 text-[13px] text-muted">{tr('Dùng bàn phím cho nhanh. Các phím một chữ không chạy khi bạn đang gõ trong ô nhập.')}</p>
      <div className="mt-4 space-y-5">
        {GROUPS.map((g) => (
          <section key={g.title}>
            <h3 className="mb-1.5 text-xs font-semibold tracking-wide text-faint uppercase">{g.title}</h3>
            <ul className="divide-y divide-line/70">
              {g.items.map((it) => (
                <li key={it.label} className="flex items-center justify-between gap-4 py-2 text-[13px]">
                  <span>{it.label}</span>
                  <Keys keys={it.keys} then={it.then} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <div className="mt-5 flex justify-end">
        <button type="button" onClick={closeShortcuts} className="h-10 rounded-xl bg-accent px-4 text-[13px] font-semibold text-white hover:brightness-110">
          {tr('Đã hiểu')}
        </button>
      </div>
    </Dialog>
  );
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

const pad = (n) => String(n).padStart(2, '0');
const timeFmt = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' });
const longDateFmt = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' });
const monthFmt = new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' });

export const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export const shortDate = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
export const formatTime = (d) => timeFmt.format(new Date(d));

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function dayDiff(a, b) {
  return Math.round((startOfDay(a) - startOfDay(b)) / DAY);
}

export function isSameDay(a, b) {
  return dayDiff(a, b) === 0;
}

export function isOverdue(task, now = new Date()) {
  return task.status !== 'done' && !!task.deadline && new Date(task.deadline) < now;
}

/** Nhóm hạn chót của task cho trang Việc của tôi. */
export function dueBucket(task, now = new Date()) {
  if (!task.deadline) return 'none';
  if (isOverdue(task, now)) return 'overdue';
  const days = dayDiff(task.deadline, now);
  if (days === 0) return 'today';
  if (days <= 7) return 'week';
  return 'later';
}

/** Chip hạn chót: { label, tone } với tone là class màu. */
export function describeDeadline(task, now = new Date()) {
  if (!task.deadline) return null;
  const deadline = new Date(task.deadline);
  const time = timeFmt.format(deadline);
  if (task.status === 'done') return { label: shortDate(deadline), tone: 'tone-muted' };

  const diff = deadline - now;
  if (diff < 0) {
    const late = -diff;
    if (late < HOUR) return { label: `Trễ ${Math.max(1, Math.round(late / MINUTE))} phút`, tone: 'tone-danger' };
    if (late < DAY) return { label: `Trễ ${Math.round(late / HOUR)} giờ`, tone: 'tone-danger' };
    return { label: `Trễ ${Math.round(late / DAY)} ngày`, tone: 'tone-danger' };
  }
  const days = dayDiff(deadline, now);
  if (days === 0) return { label: `Hôm nay ${time}`, tone: 'tone-warning' };
  if (days === 1) return { label: `Mai ${time}`, tone: 'tone-accent' };
  if (days < 7) return { label: `${WEEKDAYS[(deadline.getDay() + 6) % 7]}, ${shortDate(deadline)}`, tone: 'tone-muted' };
  return { label: shortDate(deadline), tone: 'tone-muted' };
}

export function formatLongDate(date = new Date()) {
  const text = longDateFmt.format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatMonth(date) {
  const text = monthFmt.format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return 'Khuya rồi';
  if (h < 11) return 'Chào buổi sáng';
  if (h < 13) return 'Chào buổi trưa';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

export function relativeTime(date, now = new Date()) {
  const diff = now - new Date(date);
  if (diff < MINUTE) return 'vừa xong';
  if (diff < HOUR) return `${Math.round(diff / MINUTE)} phút trước`;
  if (diff < DAY) return `${Math.round(diff / HOUR)} giờ trước`;
  const days = Math.round(diff / DAY);
  if (days < 30) return `${days} ngày trước`;
  return shortDate(new Date(date));
}

export function dayLabel(date, now = new Date()) {
  const d = dayDiff(date, now);
  if (d === 0) return 'Hôm nay';
  if (d === -1) return 'Hôm qua';
  const dt = new Date(date);
  return `${WEEKDAYS[(dt.getDay() + 6) % 7]}, ${shortDate(dt)}`;
}

/** ISO -> giá trị cho <input type="datetime-local">. */
export function toInputValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromInputValue(value) {
  return value ? new Date(value).toISOString() : null;
}

/** Các mốc nhanh: hôm nay 17:00, mai 9:00, thứ Hai tới 9:00. */
export function quickDeadline(kind, now = new Date()) {
  const d = new Date(now);
  if (kind === 'today') {
    d.setHours(17, 0, 0, 0);
    if (d <= now) d.setHours(23, 0, 0, 0);
  } else if (kind === 'tomorrow') {
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
  } else if (kind === 'nextWeek') {
    const add = (8 - d.getDay()) % 7 || 7;
    d.setDate(d.getDate() + add);
    d.setHours(9, 0, 0, 0);
  }
  return d.toISOString();
}

/** Lưới tháng bắt đầu từ thứ Hai, luôn đủ 6 hàng. */
export function monthGrid(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export const tzOffset = () => new Date().getTimezoneOffset();

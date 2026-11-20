// Tiện ích ngày giờ theo múi giờ của người dùng.
// tzOffset theo quy ước của Date#getTimezoneOffset(): số phút UTC - giờ địa phương (Việt Nam = -420).

export const MINUTE = 60 * 1000;
export const DAY = 24 * 60 * MINUTE;

export function parseTzOffset(value) {
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n) <= 14 * 60 ? n : 0;
}

/** Số thứ tự ngày (theo giờ địa phương) của một mốc thời gian. */
export function dayIndex(date, tzOffset) {
  return Math.floor((new Date(date).getTime() - tzOffset * MINUTE) / DAY);
}

/** Mốc UTC bắt đầu của ngày địa phương có số thứ tự `index`. */
export function dayStart(index, tzOffset) {
  return new Date(index * DAY + tzOffset * MINUTE);
}

/** Thứ trong tuần theo giờ địa phương, 0 = thứ Hai ... 6 = Chủ nhật. */
export function weekdayMon(index) {
  // 1/1/1970 (index 0) là thứ Năm -> 3 nếu tính từ thứ Hai
  return (((index + 3) % 7) + 7) % 7;
}

/** Khoảng [start, end) của các bộ lọc hạn chót theo ngày địa phương. */
export function dueRange(kind, now, tzOffset) {
  const today = dayIndex(now, tzOffset);
  if (kind === 'today') return [dayStart(today, tzOffset), dayStart(today + 1, tzOffset)];
  if (kind === 'week') return [dayStart(today, tzOffset), dayStart(today + 7, tzOffset)];
  return null;
}

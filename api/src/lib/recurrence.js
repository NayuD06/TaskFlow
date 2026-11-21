// Tính ngày của lần lặp tiếp theo (thuần JS, không đụng DB).
import { REPEATS } from '../models/Task.js';

const DAY = 24 * 60 * 60 * 1000;

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

// Cộng tháng nhưng giữ ngày gốc: 31/1 -> 28/2 -> 31/3 (không bị trôi dần về ngày 28)
function addMonths(base, months) {
  const d = new Date(base);
  const total = d.getUTCMonth() + months;
  const year = d.getUTCFullYear() + Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  d.setUTCFullYear(year, month, Math.min(base.getUTCDate(), daysInMonth(year, month)));
  return d;
}

/**
 * Ngày đến hạn của lần tiếp theo.
 *  base:     hạn chót hiện tại (không có thì tính từ bây giờ)
 *  repeat:   daily | weekdays | weekly | monthly
 *  tzOffset: theo quy ước Date.getTimezoneOffset() (Việt Nam là -420), để "thứ Hai" đúng theo giờ của người dùng
 * Nếu hoàn thành trễ, bỏ qua các lần đã trôi qua và trả về lần gần nhất trong tương lai.
 */
export function nextOccurrence(base, repeat, { now = new Date(), tzOffset = 0 } = {}) {
  if (!REPEATS.includes(repeat) || repeat === 'none') return null;
  const shift = tzOffset * 60 * 1000;
  // Đổi sang "giờ địa phương" dưới dạng các trường UTC để cộng ngày cho dễ
  const start = new Date((base ? new Date(base).getTime() : now.getTime()) - shift);
  const nowLocal = now.getTime() - shift;

  let current = start;
  let months = 0;
  const step = () => {
    if (repeat === 'monthly') {
      months += 1;
      current = addMonths(start, months);
    } else if (repeat === 'weekly') {
      current = new Date(current.getTime() + 7 * DAY);
    } else {
      current = new Date(current.getTime() + DAY);
      if (repeat === 'weekdays') while ([0, 6].includes(current.getUTCDay())) current = new Date(current.getTime() + DAY);
    }
  };

  step();
  for (let guard = 0; current.getTime() <= nowLocal && guard < 2000; guard += 1) step();
  return new Date(current.getTime() + shift);
}

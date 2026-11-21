const nf = new Intl.NumberFormat('vi-VN');
const rtf = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' });

export const num = (n) => nf.format(n ?? 0);

export function bytes(n) {
  if (!n) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  const v = n / 1024 ** i;
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: v < 10 && i > 0 ? 1 : 0 }).format(v)} ${units[i]}`;
}

export function ago(date) {
  if (!date) return 'Chưa bao giờ';
  const s = (new Date(date).getTime() - Date.now()) / 1000;
  const abs = Math.abs(s);
  if (abs < 45) return 'vừa xong';
  if (abs < 3600) return rtf.format(Math.round(s / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(s / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(s / 86400), 'day');
  return dateShort(date);
}

export const dateShort = (date) => (date ? new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '');
export const dateTime = (date) =>
  date ? new Date(date).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

/** Ảnh thu nhỏ từ Cloudinary (cắt vừa khung, tự chọn định dạng nhẹ nhất). */
export function thumb(url, w = 400, h = 300) {
  if (!url || !url.includes('/image/upload/')) return url;
  return url.replace('/image/upload/', `/image/upload/c_fill,w_${w},h_${h},f_auto,q_auto/`);
}

export const HUES = {
  blue: '#3b82f6',
  sky: '#38bdf8',
  cyan: '#22d3ee',
  teal: '#2dd4bf',
  green: '#4ade80',
  amber: '#fbbf24',
  orange: '#fb923c',
  rose: '#fb7185',
  violet: '#a78bfa',
  indigo: '#818cf8',
};

import { tr } from './i18n.js';

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

export const HUE_NAMES = {
  blue: tr('Xanh dương'),
  sky: tr('Xanh trời'),
  cyan: tr('Lam ngọc'),
  teal: tr('Xanh két'),
  green: tr('Xanh lá'),
  amber: tr('Hổ phách'),
  orange: tr('Cam'),
  rose: tr('Hồng'),
  violet: tr('Tím'),
  indigo: tr('Chàm'),
};

export const hueOf = (color) => HUES[color] || HUES.blue;
export const hueStyle = (color) => ({ '--hue': hueOf(color) });

export const STATUSES = ['todo', 'doing', 'done'];
export const STATUS = {
  todo: { label: tr('Cần làm'), short: tr('Cần làm'), tone: 'tone-muted', color: '#8a96b3' },
  doing: { label: tr('Đang làm'), short: tr('Đang làm'), tone: 'tone-accent', color: '#2f6bff' },
  done: { label: tr('Đã xong'), short: tr('Xong'), tone: 'tone-success', color: '#22c38e' },
};

export const PRIORITIES = ['urgent', 'high', 'medium', 'low'];
export const PRIORITY = {
  urgent: { label: tr('Khẩn cấp'), tone: 'tone-danger', color: '#ff4d6a' },
  high: { label: tr('Cao'), tone: 'tone-warning', color: '#fb923c' },
  medium: { label: tr('Vừa'), tone: 'tone-accent', color: '#6b95ff' },
  low: { label: tr('Thấp'), tone: 'tone-muted', color: '#8a96b3' },
};

export const SORT_OPTIONS = [
  { value: 'board', label: tr('Thứ tự trên bảng') },
  { value: 'deadline', label: tr('Hạn gần nhất') },
  { value: 'priority', label: tr('Ưu tiên cao trước') },
  { value: 'newest', label: tr('Mới thêm') },
];

/** Ảnh đại diện có sẵn (phải khớp AVATAR_EMOJIS ở api/src/models/User.js). */
export const AVATAR_EMOJIS = ['🐳', '🐬', '🐙', '🦈', '🐢', '🦦', '🐧', '🦀', '🐠', '🪼', '🐋', '🦭'];
export const AVATAR_MAX_LENGTH = 60_000;

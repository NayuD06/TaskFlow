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
  blue: 'Xanh dương',
  sky: 'Xanh trời',
  cyan: 'Lam ngọc',
  teal: 'Xanh két',
  green: 'Xanh lá',
  amber: 'Hổ phách',
  orange: 'Cam',
  rose: 'Hồng',
  violet: 'Tím',
  indigo: 'Chàm',
};

export const hueOf = (color) => HUES[color] || HUES.blue;
export const hueStyle = (color) => ({ '--hue': hueOf(color) });

export const STATUSES = ['todo', 'doing', 'done'];
export const STATUS = {
  todo: { label: 'Cần làm', short: 'Cần làm', tone: 'tone-muted', color: '#8a96b3' },
  doing: { label: 'Đang làm', short: 'Đang làm', tone: 'tone-accent', color: '#2f6bff' },
  done: { label: 'Đã xong', short: 'Xong', tone: 'tone-success', color: '#22c38e' },
};

export const PRIORITIES = ['urgent', 'high', 'medium', 'low'];
export const PRIORITY = {
  urgent: { label: 'Khẩn cấp', tone: 'tone-danger', color: '#ff4d6a' },
  high: { label: 'Cao', tone: 'tone-warning', color: '#fb923c' },
  medium: { label: 'Vừa', tone: 'tone-accent', color: '#6b95ff' },
  low: { label: 'Thấp', tone: 'tone-muted', color: '#8a96b3' },
};

export const SORT_OPTIONS = [
  { value: 'board', label: 'Thứ tự trên bảng' },
  { value: 'deadline', label: 'Hạn gần nhất' },
  { value: 'priority', label: 'Ưu tiên cao trước' },
  { value: 'newest', label: 'Mới thêm' },
];

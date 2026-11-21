// Xuất / nhập dữ liệu (thuần JS, không đụng DB) để dễ test.
import { PROJECT_COLORS } from '../models/Project.js';
import { PRIORITIES, REPEATS, STATUSES } from '../models/Task.js';
import { normalizeTags } from '../controllers/taskQuery.js';

export const EXPORT_VERSION = 1;
export const IMPORT_LIMITS = { projects: 100, tasks: 5000 };

const idOf = (v) => String(v?._id ?? v);
const iso = (d) => (d ? new Date(d).toISOString() : null);

/** File JSON đầy đủ: mỗi dự án kèm danh sách công việc bên trong. */
export function buildExport({ user, projects, tasks, now = new Date() }) {
  const byProject = new Map();
  for (const t of tasks) {
    const key = idOf(t.project);
    if (!byProject.has(key)) byProject.set(key, []);
    byProject.get(key).push(t);
  }
  return {
    app: 'TaskFlow',
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    owner: { name: user.name, email: user.email },
    projects: projects.map((p) => ({
      name: p.name,
      description: p.description || '',
      color: p.color,
      archived: !!p.archived,
      createdAt: iso(p.createdAt),
      tasks: (byProject.get(idOf(p._id)) || [])
        .sort((a, b) => (a.status === b.status ? (a.order ?? 0) - (b.order ?? 0) : STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status)))
        .map((t) => ({
          title: t.title,
          description: t.description || '',
          status: t.status,
          priority: t.priority,
          deadline: iso(t.deadline),
          completedAt: iso(t.completedAt),
          checklist: (t.checklist || []).map((c) => ({ text: c.text, done: !!c.done })),
          tags: t.tags || [],
          repeat: t.repeat || 'none',
          createdAt: iso(t.createdAt),
        })),
    })),
  };
}

const LABELS = {
  vi: {
    head: ['Dự án', 'Công việc', 'Trạng thái', 'Ưu tiên', 'Hạn chót', 'Hoàn thành lúc', 'Nhãn', 'Checklist', 'Lặp lại', 'Mô tả', 'Tạo lúc'],
    status: { todo: 'Cần làm', doing: 'Đang làm', done: 'Đã xong' },
    priority: { low: 'Thấp', medium: 'Vừa', high: 'Cao', urgent: 'Khẩn cấp' },
    repeat: { none: '', daily: 'Hằng ngày', weekdays: 'Ngày làm việc', weekly: 'Hằng tuần', monthly: 'Hằng tháng' },
  },
  en: {
    head: ['Project', 'Task', 'Status', 'Priority', 'Deadline', 'Completed at', 'Tags', 'Checklist', 'Repeat', 'Description', 'Created at'],
    status: { todo: 'To do', doing: 'In progress', done: 'Done' },
    priority: { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' },
    repeat: { none: '', daily: 'Daily', weekdays: 'Weekdays', weekly: 'Weekly', monthly: 'Monthly' },
  },
};

// Bọc ô CSV; chặn "CSV injection" (ô bắt đầu bằng = + - @ bị Excel hiểu là công thức)
function cell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Bảng công việc dạng CSV (có BOM để Excel đọc đúng tiếng Việt). */
export function tasksToCsv(projects, tasks, lang = 'vi') {
  const L = LABELS[lang] || LABELS.vi;
  const names = new Map(projects.map((p) => [idOf(p._id), p.name]));
  const rows = [L.head];
  for (const t of tasks) {
    const list = t.checklist || [];
    rows.push([
      names.get(idOf(t.project)) || '',
      t.title,
      L.status[t.status] || t.status,
      L.priority[t.priority] || t.priority,
      iso(t.deadline) || '',
      iso(t.completedAt) || '',
      (t.tags || []).join(', '),
      list.length ? `${list.filter((c) => c.done).length}/${list.length}` : '',
      L.repeat[t.repeat || 'none'] ?? '',
      t.description || '',
      iso(t.createdAt) || '',
    ]);
  }
  return `﻿${rows.map((r) => r.map(cell).join(',')).join('\r\n')}\r\n`;
}

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const pick = (v, list, fallback) => (list.includes(v) ? v : fallback);
function date(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
function tags(v) {
  if (!Array.isArray(v)) return [];
  try {
    return normalizeTags(v);
  } catch {
    return normalizeTags(v.slice(0, 8));
  }
}

/** Kiểm tra và làm sạch file đã xuất trước đó. Ném lỗi 400 nếu sai định dạng hoặc quá lớn. */
export function parseImport(data) {
  if (!data || typeof data !== 'object' || data.app !== 'TaskFlow' || !Array.isArray(data.projects)) {
    throw badRequest('File không đúng định dạng xuất của TaskFlow');
  }
  if (data.projects.length > IMPORT_LIMITS.projects) throw badRequest(`Mỗi lần nhập tối đa ${IMPORT_LIMITS.projects} dự án`);

  let taskCount = 0;
  const projects = data.projects.map((p, i) => {
    const name = text(p?.name, 60);
    if (!name) throw badRequest(`Dự án thứ ${i + 1} chưa có tên`);
    const list = Array.isArray(p.tasks) ? p.tasks : [];
    taskCount += list.length;
    if (taskCount > IMPORT_LIMITS.tasks) throw badRequest(`Mỗi lần nhập tối đa ${IMPORT_LIMITS.tasks} công việc`);
    return {
      name,
      description: text(p.description, 300),
      color: pick(p.color, PROJECT_COLORS, 'blue'),
      archived: !!p.archived,
      tasks: list
        .map((t) => {
          const status = pick(t?.status, STATUSES, 'todo');
          return {
            title: text(t?.title, 120),
            description: text(t?.description, 2000),
            status,
            priority: pick(t?.priority, PRIORITIES, 'medium'),
            deadline: date(t?.deadline),
            completedAt: status === 'done' ? date(t?.completedAt) || new Date() : null,
            checklist: (Array.isArray(t?.checklist) ? t.checklist : [])
              .slice(0, 50)
              .map((c) => ({ text: text(c?.text, 200), done: !!c?.done }))
              .filter((c) => c.text),
            tags: tags(t?.tags),
            repeat: pick(t?.repeat, REPEATS, 'none'),
          };
        })
        .filter((t) => t.title),
    };
  });
  return { projects, taskCount: projects.reduce((n, p) => n + p.tasks.length, 0) };
}

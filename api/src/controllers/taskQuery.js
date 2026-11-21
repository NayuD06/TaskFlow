// Logic thuần (không đụng DB) để dựng truy vấn danh sách task và lọc dữ liệu đầu vào.
import { MAX_TAG_LENGTH, MAX_TAGS, PRIORITIES, REPEATS, STATUSES } from '../models/Task.js';
import { dueRange } from '../lib/time.js';

// Việc đã xong luôn "chìm" xuống cuối, trừ chế độ board (sắp theo cột rồi theo thứ tự kéo thả)
const SORTS = {
  board: { statusRank: 1, order: 1, createdAt: -1 },
  newest: { isDone: 1, createdAt: -1 },
  oldest: { isDone: 1, createdAt: 1 },
  deadline: { isDone: 1, hasDeadline: -1, deadline: 1, priorityRank: -1 },
  priority: { isDone: 1, priorityRank: -1, hasDeadline: -1, deadline: 1 },
  updated: { isDone: 1, updatedAt: -1 },
  title: { isDone: 1, title: 1 },
};

export const SORT_KEYS = Object.keys(SORTS);

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Dựng pipeline aggregate từ query string.
 *  project:  id dự án
 *  status:   todo | doing | done | open (chưa xong) | overdue
 *  priority: low | medium | high | urgent, có thể nhiều giá trị cách nhau dấu phẩy (high,urgent)
 *  due:      today | week | overdue | none (theo múi giờ tzOffset)
 *  tag:      một nhãn (không phân biệt hoa thường)
 *  search:   tìm theo tên, mô tả hoặc nhãn
 *  sort:     board | newest | oldest | deadline | priority | updated | title
 * projectIds: các dự án người dùng được xem (của mình và được mời vào)
 */
export function buildListPipeline(query = {}, { owner, projectIds, now = new Date(), tzOffset = 0, toId = (v) => v } = {}) {
  // Luôn giới hạn trong dữ liệu người đang đăng nhập được xem: dự án của mình và dự án được mời vào
  const match = owner ? { owner } : {};
  const { project, status, priority, due, search, sort, tag } = query;
  const allowed = projectIds ? projectIds.map(String) : null;

  if (project) {
    // Hỏi dự án không được phép thì trả về rỗng thay vì lộ dữ liệu
    match.project = allowed && !allowed.includes(String(project)) ? { $in: [] } : toId(project);
  } else if (projectIds) {
    match.project = { $in: projectIds };
  }

  if (status === 'overdue') {
    match.status = { $ne: 'done' };
    match.deadline = { $ne: null, $lt: now };
  } else if (status === 'open') {
    match.status = { $ne: 'done' };
  } else if (STATUSES.includes(status)) {
    match.status = status;
  }

  if (typeof priority === 'string') {
    const list = [...new Set(priority.split(','))].filter((p) => PRIORITIES.includes(p));
    if (list.length === 1) match.priority = list[0];
    else if (list.length > 1) match.priority = { $in: list };
  }

  if (typeof tag === 'string' && tag.trim()) {
    match.tags = { $regex: `^${escapeRegex(tag.trim().slice(0, MAX_TAG_LENGTH))}$`, $options: 'i' };
  }

  if (due === 'none') {
    match.deadline = null;
  } else if (due === 'overdue') {
    match.status = { $ne: 'done' };
    match.deadline = { $ne: null, $lt: now };
  } else {
    const range = dueRange(due, now, tzOffset);
    if (range) match.deadline = { $gte: range[0], $lt: range[1] };
  }

  if (typeof search === 'string' && search.trim()) {
    const regex = new RegExp(escapeRegex(search.trim().slice(0, 100)), 'i');
    match.$or = [{ title: regex }, { description: regex }, { tags: regex }];
  }

  return [
    { $match: match },
    {
      $addFields: {
        priorityRank: { $indexOfArray: [PRIORITIES, '$priority'] },
        statusRank: { $indexOfArray: [STATUSES, '$status'] },
        hasDeadline: { $cond: [{ $ifNull: ['$deadline', false] }, 1, 0] },
        isDone: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] },
      },
    },
    { $sort: SORTS[sort] || SORTS.newest },
    { $project: { priorityRank: 0, statusRank: 0, hasDeadline: 0, isDone: 0 } },
  ];
}

const EDITABLE = ['title', 'description', 'status', 'priority', 'deadline', 'project', 'checklist', 'tags', 'repeat'];

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

/** Chuẩn hoá nhãn: bỏ khoảng trắng thừa và dấu #, cắt độ dài, bỏ trùng (không phân biệt hoa thường). */
export function normalizeTags(value) {
  if (!Array.isArray(value)) throw badRequest('Nhãn phải là một mảng');
  const seen = new Map();
  for (const raw of value) {
    if (typeof raw !== 'string') continue;
    const tag = raw.replace(/^#+/, '').trim().replace(/\s+/g, ' ').slice(0, MAX_TAG_LENGTH).trim();
    if (tag && !seen.has(tag.toLowerCase())) seen.set(tag.toLowerCase(), tag);
  }
  if (seen.size > MAX_TAGS) throw badRequest(`Tối đa ${MAX_TAGS} nhãn cho một công việc`);
  return [...seen.values()];
}

/** Chỉ giữ lại các trường được phép sửa, chuẩn hoá deadline, checklist và nhãn. */
export function pickTaskFields(body = {}) {
  const data = {};
  for (const key of EDITABLE) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  if ('deadline' in data) {
    data.deadline = data.deadline ? new Date(data.deadline) : null;
    if (data.deadline && Number.isNaN(data.deadline.getTime())) throw badRequest('Deadline không hợp lệ');
  }
  if ('checklist' in data) {
    if (!Array.isArray(data.checklist)) throw badRequest('Checklist phải là một mảng');
    data.checklist = data.checklist.map((item) => {
      const clean = { text: String(item?.text ?? ''), done: Boolean(item?.done) };
      if (item?._id) clean._id = item._id;
      return clean;
    });
  }
  if ('tags' in data) data.tags = normalizeTags(data.tags);
  if ('repeat' in data) {
    if (!REPEATS.includes(data.repeat)) throw badRequest('Kiểu lặp lại không hợp lệ');
    data.repeatSpawned = false;
  }
  return data;
}

const PROJECT_EDITABLE = ['name', 'description', 'color', 'archived'];

export function pickProjectFields(body = {}) {
  const data = {};
  for (const key of PROJECT_EDITABLE) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  if ('archived' in data) data.archived = Boolean(data.archived);
  return data;
}

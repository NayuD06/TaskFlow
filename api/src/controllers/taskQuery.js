// Logic thuần (không đụng DB) để dựng truy vấn danh sách task và lọc dữ liệu đầu vào.
import { PRIORITIES, STATUSES } from '../models/Task.js';
import { dueRange } from '../lib/time.js';

// Việc đã xong luôn "chìm" xuống cuối, trừ chế độ board (sắp theo cột rồi theo thứ tự kéo thả)
const SORTS = {
  board: { statusRank: 1, order: 1, createdAt: -1 },
  newest: { isDone: 1, createdAt: -1 },
  oldest: { isDone: 1, createdAt: 1 },
  deadline: { isDone: 1, hasDeadline: -1, deadline: 1, priorityRank: -1 },
  priority: { isDone: 1, priorityRank: -1, hasDeadline: -1, deadline: 1 },
};

export const SORT_KEYS = Object.keys(SORTS);

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Dựng pipeline aggregate từ query string.
 *  project:  id dự án
 *  status:   todo | doing | done | open (chưa xong) | overdue
 *  priority: low | medium | high | urgent
 *  due:      today | week | overdue | none (theo múi giờ tzOffset)
 *  search:   tìm theo tên hoặc mô tả
 *  sort:     board | newest | oldest | deadline | priority
 */
export function buildListPipeline(query = {}, { now = new Date(), tzOffset = 0, toId = (v) => v } = {}) {
  const match = {};
  const { project, status, priority, due, search, sort } = query;

  if (project) match.project = toId(project);

  if (status === 'overdue') {
    match.status = { $ne: 'done' };
    match.deadline = { $ne: null, $lt: now };
  } else if (status === 'open') {
    match.status = { $ne: 'done' };
  } else if (STATUSES.includes(status)) {
    match.status = status;
  }

  if (PRIORITIES.includes(priority)) match.priority = priority;

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
    match.$or = [{ title: regex }, { description: regex }];
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

const EDITABLE = ['title', 'description', 'status', 'priority', 'deadline', 'project', 'checklist'];

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

/** Chỉ giữ lại các trường được phép sửa, chuẩn hoá deadline và checklist. */
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

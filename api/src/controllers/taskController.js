import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { nextOccurrence } from '../lib/recurrence.js';
import { parseTzOffset } from '../lib/time.js';
import { validateAttachment, validateComment, validateMinutes } from '../lib/validate.js';
import { Comment } from '../models/Comment.js';
import { Project } from '../models/Project.js';
import { MAX_ATTACHMENTS, STATUSES, Task } from '../models/Task.js';
import { User, memberCard } from '../models/User.js';
import { accessibleProjectIds, findProjectOr404, findTaskOr404, isOwner } from '../services/access.js';
import { logActivity } from '../services/activity.js';
import { buildListPipeline, pickTaskFields } from './taskQuery.js';

const idOf = (v) => String(v?._id ?? v);

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

/** Gắn thông tin dự án (tên, màu) và số bình luận vào task trả về cho client. */
async function decorate(tasks) {
  const projectIds = [...new Set(tasks.map((t) => idOf(t.project)))];
  const [projects, counts] = await Promise.all([
    Project.find({ _id: { $in: projectIds } }, { name: 1, color: 1 }).lean(),
    Comment.aggregate([{ $match: { task: { $in: tasks.map((t) => t._id) } } }, { $group: { _id: '$task', n: { $sum: 1 } } }]),
  ]);
  const byProject = new Map(projects.map((p) => [idOf(p._id), p]));
  const byTask = new Map(counts.map((c) => [idOf(c._id), c.n]));
  return tasks.map((t) => {
    const { repeatSpawned, ...rest } = t;
    return { ...rest, project: byProject.get(idOf(t.project)) || { _id: t.project }, commentCount: byTask.get(idOf(t._id)) || 0 };
  });
}

async function respondTask(res, task, { status = 200, extra = {} } = {}) {
  const [data] = await decorate([task.toObject ? task.toObject() : task]);
  res.status(status).json({ data: { ...data, ...extra } });
}

async function nextOrder(projectId, status) {
  const last = await Task.findOne({ project: projectId, status }).sort({ order: -1 }).select('order').lean();
  return (last?.order ?? -1) + 1;
}

// Việc vừa hoàn thành nằm đầu cột "Đã xong"
async function topOrder(projectId, status) {
  const first = await Task.findOne({ project: projectId, status }).sort({ order: 1 }).select('order').lean();
  return (first?.order ?? 1) - 1;
}

const orderFor = (projectId, status) => (status === 'done' ? topOrder(projectId, status) : nextOrder(projectId, status));

/**
 * Việc lặp lại vừa được đánh dấu xong: tạo lần tiếp theo (chỉ một lần cho mỗi việc).
 * Trả về { _id, deadline } của việc mới, hoặc null.
 */
async function spawnNext(task, project, actor, tzOffset) {
  if (task.status !== 'done' || !task.repeat || task.repeat === 'none' || task.repeatSpawned) return null;
  const deadline = nextOccurrence(task.deadline, task.repeat, { tzOffset });
  const next = await Task.create({
    owner: task.owner,
    project: task.project,
    title: task.title,
    description: task.description,
    priority: task.priority,
    tags: task.tags,
    checklist: task.checklist.map((c) => ({ text: c.text, done: false })),
    repeat: task.repeat,
    deadline,
    status: 'todo',
    order: await nextOrder(task.project, 'todo'),
    createdBy: actor._id,
  });
  task.repeatSpawned = true;
  await task.save();
  await logActivity('task_created', { task: next, project, actor });
  return { _id: next._id, deadline: next.deadline };
}

async function logStatusChange(task, project, from, actor) {
  if (task.status === 'done') await logActivity('task_completed', { task, project, actor, from, to: 'done' });
  else if (from === 'done') await logActivity('task_reopened', { task, project, actor, from, to: task.status });
  else await logActivity('task_moved', { task, project, actor, from, to: task.status });
}

/** Sau khi đổi trạng thái: ghi hoạt động, và nếu vừa xong một việc lặp lại thì tạo lần sau. */
async function afterStatusChange(req, task, project, before) {
  if (task.status === before) return {};
  await logStatusChange(task, project, before, req.user);
  const next = await spawnNext(task, project, req.user, parseTzOffset(req.query.tzOffset));
  return next ? { nextOccurrence: next } : {};
}

// GET /api/tasks/tags  -> các nhãn đang dùng kèm số lượng việc, nhiều nhất trước
export async function listTags(req, res) {
  const projectIds = await accessibleProjectIds(req.user._id);
  const rows = await Task.aggregate([
    { $match: { project: { $in: projectIds } } },
    { $unwind: '$tags' },
    { $group: { _id: { $toLower: '$tags' }, name: { $first: '$tags' }, count: { $sum: 1 } } },
    { $sort: { count: -1, name: 1 } },
    { $limit: 50 },
  ]);
  res.json({ data: rows.map((r) => ({ name: r.name, count: r.count })) });
}

// GET /api/tasks
export async function listTasks(req, res) {
  if (req.query.project && !mongoose.isValidObjectId(req.query.project)) {
    return res.json({ data: [], count: 0 });
  }
  const pipeline = buildListPipeline(req.query, {
    projectIds: await accessibleProjectIds(req.user._id),
    tzOffset: parseTzOffset(req.query.tzOffset),
    toId: (id) => new mongoose.Types.ObjectId(String(id)),
  });
  const tasks = await decorate(await Task.aggregate(pipeline));
  res.json({ data: tasks, count: tasks.length });
}

// GET /api/tasks/:id
export async function getTask(req, res) {
  const { task } = await findTaskOr404(req.params.id, req.user._id);
  await respondTask(res, task);
}

// POST /api/tasks
export async function createTask(req, res) {
  const data = pickTaskFields(req.body);
  const project = await findProjectOr404(data.project, req.user._id);
  const status = STATUSES.includes(data.status) ? data.status : 'todo';
  const task = await Task.create({
    ...data,
    owner: project.owner,
    createdBy: req.user._id,
    status,
    order: await orderFor(project._id, status),
  });
  await logActivity('task_created', { task, project, actor: req.user });
  if (task.status === 'done') await logActivity('task_completed', { task, project, actor: req.user });
  await respondTask(res, task, { status: 201 });
}

// PATCH /api/tasks/:id
export async function updateTask(req, res) {
  let { task, project } = await findTaskOr404(req.params.id, req.user._id);
  const before = task.status;
  const data = pickTaskFields(req.body);
  if (data.project && idOf(data.project) !== idOf(task.project)) {
    // Chuyển sang dự án khác: phải được vào dự án đó, và dữ liệu thuộc về chủ dự án mới
    project = await findProjectOr404(data.project, req.user._id);
    data.owner = project.owner;
    data.order = await orderFor(project._id, data.status || task.status);
  } else if (data.status && data.status !== before) {
    data.order = await orderFor(task.project, data.status);
  }
  task.set(data);
  await task.save();
  const extra = await afterStatusChange(req, task, project, before);
  await respondTask(res, task, { extra });
}

// PATCH /api/tasks/:id/toggle  (xong <-> chưa xong)
export async function toggleTask(req, res) {
  const { task, project } = await findTaskOr404(req.params.id, req.user._id);
  const before = task.status;
  task.status = before === 'done' ? 'todo' : 'done';
  task.order = await orderFor(task.project, task.status);
  await task.save();
  const extra = await afterStatusChange(req, task, project, before);
  await respondTask(res, task, { extra });
}

// POST /api/tasks/:id/move  { status, index }  kéo thả trên bảng Kanban
export async function moveTask(req, res) {
  const { task, project } = await findTaskOr404(req.params.id, req.user._id);
  const { status = task.status } = req.body ?? {};
  if (!STATUSES.includes(status)) throw badRequest('Trạng thái không hợp lệ');
  const before = task.status;

  // Lấy các task khác trong cột đích theo thứ tự hiện tại, chèn task vào vị trí index
  const column = await Task.find({ project: task.project, status, _id: { $ne: task._id } })
    .sort({ order: 1, createdAt: -1 })
    .select('_id')
    .lean();
  const index = Math.max(0, Math.min(Number(req.body.index) || 0, column.length));
  const ids = column.map((t) => t._id);
  ids.splice(index, 0, task._id);

  task.status = status;
  task.order = index;
  await task.save();
  const ops = ids
    .map((id, i) => ({ updateOne: { filter: { _id: id }, update: { $set: { order: i } } } }))
    .filter((_, i) => i !== index);
  if (ops.length) await Task.bulkWrite(ops);

  const extra = await afterStatusChange(req, task, project, before);
  await respondTask(res, task, { extra });
}

// DELETE /api/tasks/:id
export async function deleteTask(req, res) {
  const { task, project } = await findTaskOr404(req.params.id, req.user._id);
  await task.deleteOne();
  await Comment.deleteMany({ task: task._id });
  await logActivity('task_deleted', { task, project, actor: req.user });
  res.json({ data: { _id: task._id } });
}

// DELETE /api/tasks?status=done&project=<id>  (dọn việc đã xong)
export async function clearDone(req, res) {
  if (req.query.status !== 'done') throw badRequest('Chỉ hỗ trợ xoá hàng loạt với ?status=done');
  if (!mongoose.isValidObjectId(req.query.project)) throw badRequest('Thiếu hoặc sai mã dự án');
  const project = await findProjectOr404(req.query.project, req.user._id);
  const filter = { project: project._id, status: 'done' };
  const ids = await Task.find(filter).distinct('_id');
  const { deletedCount } = await Task.deleteMany(filter);
  await Comment.deleteMany({ task: { $in: ids } });
  res.json({ data: { deletedCount } });
}

/* ---------- Bình luận ---------- */

async function presentComments(comments) {
  const authors = await User.find({ _id: { $in: [...new Set(comments.map((c) => idOf(c.author)))] } }, { name: 1, avatar: 1, avatarColor: 1 }).lean();
  const byId = new Map(authors.map((u) => [idOf(u._id), memberCard(u)]));
  return comments.map((c) => ({
    _id: c._id,
    task: c.task,
    text: c.text,
    createdAt: c.createdAt,
    author: byId.get(idOf(c.author)) || { _id: c.author, name: 'Người dùng đã xoá', avatar: '', avatarColor: 'blue' },
  }));
}

// GET /api/tasks/:id/comments
export async function listComments(req, res) {
  const { task } = await findTaskOr404(req.params.id, req.user._id);
  const comments = await Comment.find({ task: task._id }).sort({ createdAt: 1 }).limit(500).lean();
  res.json({ data: await presentComments(comments) });
}

// POST /api/tasks/:id/comments  { text }
export async function addComment(req, res) {
  const { task, project } = await findTaskOr404(req.params.id, req.user._id);
  const { text } = validateComment(req.body);
  const comment = await Comment.create({ task: task._id, project: project._id, author: req.user._id, text });
  await logActivity('task_commented', { task, project, actor: req.user });
  const [data] = await presentComments([comment.toObject()]);
  res.status(201).json({ data });
}

// DELETE /api/tasks/:id/comments/:commentId  (người viết, hoặc chủ dự án)
export async function deleteComment(req, res) {
  const { task, project } = await findTaskOr404(req.params.id, req.user._id);
  if (!mongoose.isValidObjectId(req.params.commentId)) throw badRequest('Mã bình luận không hợp lệ');
  const comment = await Comment.findOne({ _id: req.params.commentId, task: task._id });
  if (!comment) {
    const err = new Error('Không tìm thấy bình luận');
    err.status = 404;
    throw err;
  }
  if (idOf(comment.author) !== idOf(req.user._id) && !isOwner(project, req.user._id)) {
    const err = new Error('Bạn chỉ xoá được bình luận của mình');
    err.status = 403;
    throw err;
  }
  await comment.deleteOne();
  res.json({ data: { _id: comment._id } });
}

/* ---------- Ảnh đính kèm ---------- */

// POST /api/tasks/:id/attachments  { url, publicId, name, width, height, bytes }
export async function addAttachment(req, res) {
  const { task } = await findTaskOr404(req.params.id, req.user._id);
  const data = validateAttachment(req.body, env.cloudinary.cloudName);
  if (task.attachments.length >= MAX_ATTACHMENTS) throw badRequest(`Tối đa ${MAX_ATTACHMENTS} ảnh cho một công việc`);
  task.attachments.push({ ...data, addedBy: req.user._id });
  await task.save();
  await respondTask(res, task, { status: 201 });
}

// DELETE /api/tasks/:id/attachments/:attachmentId
export async function removeAttachment(req, res) {
  const { task } = await findTaskOr404(req.params.id, req.user._id);
  const before = task.attachments.length;
  task.attachments = task.attachments.filter((a) => idOf(a._id) !== req.params.attachmentId);
  if (task.attachments.length === before) {
    const err = new Error('Không tìm thấy ảnh');
    err.status = 404;
    throw err;
  }
  await task.save();
  await respondTask(res, task);
}

/* ---------- Pomodoro ---------- */

// POST /api/tasks/:id/pomodoros  { minutes }  ghi lại một phiên tập trung vừa xong
export async function logPomodoro(req, res) {
  const { task, project } = await findTaskOr404(req.params.id, req.user._id);
  const { minutes } = validateMinutes(req.body);
  task.pomodoros += 1;
  task.focusMinutes += minutes;
  await task.save();
  await logActivity('pomodoro_completed', { task, project, actor: req.user, to: String(minutes) });
  await respondTask(res, task);
}

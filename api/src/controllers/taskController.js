import mongoose from 'mongoose';
import { parseTzOffset } from '../lib/time.js';
import { Project } from '../models/Project.js';
import { STATUSES, Task } from '../models/Task.js';
import { logActivity } from '../services/activity.js';
import { findProjectOr404 } from './projectController.js';
import { buildListPipeline, pickTaskFields } from './taskQuery.js';

function notFound() {
  const err = new Error('Không tìm thấy công việc');
  err.status = 404;
  return err;
}

/** Chỉ tìm trong công việc của chính người dùng. */
async function findTaskOr404(id, owner) {
  if (!mongoose.isValidObjectId(id)) throw notFound();
  const task = await Task.findOne({ _id: id, owner });
  if (!task) throw notFound();
  return task;
}

/** Gắn thông tin dự án (tên, màu) vào task trả về cho client. */
async function withProject(tasks) {
  const ids = [...new Set(tasks.map((t) => String(t.project)))];
  const projects = await Project.find({ _id: { $in: ids } }, { name: 1, color: 1 }).lean();
  const map = new Map(projects.map((p) => [String(p._id), p]));
  return tasks.map((t) => ({ ...t, project: map.get(String(t.project)) || { _id: t.project } }));
}

async function respondTask(res, task, status = 200) {
  const [data] = await withProject([task.toObject ? task.toObject() : task]);
  res.status(status).json({ data });
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

// GET /api/tasks
export async function listTasks(req, res) {
  if (req.query.project && !mongoose.isValidObjectId(req.query.project)) {
    return res.json({ data: [], count: 0 });
  }
  const pipeline = buildListPipeline(req.query, {
    owner: req.user._id,
    tzOffset: parseTzOffset(req.query.tzOffset),
    toId: (id) => new mongoose.Types.ObjectId(String(id)),
  });
  const tasks = await withProject(await Task.aggregate(pipeline));
  res.json({ data: tasks, count: tasks.length });
}

// GET /api/tasks/:id
export async function getTask(req, res) {
  const task = await findTaskOr404(req.params.id, req.user._id);
  await respondTask(res, task);
}

// POST /api/tasks
export async function createTask(req, res) {
  const data = pickTaskFields(req.body);
  const project = await findProjectOr404(data.project, req.user._id);
  const status = STATUSES.includes(data.status) ? data.status : 'todo';
  const task = await Task.create({ ...data, owner: req.user._id, status, order: await orderFor(project._id, status) });
  await logActivity('task_created', { task, project });
  if (task.status === 'done') await logActivity('task_completed', { task, project });
  await respondTask(res, task, 201);
}

// PATCH /api/tasks/:id
export async function updateTask(req, res) {
  const task = await findTaskOr404(req.params.id, req.user._id);
  const before = task.status;
  const data = pickTaskFields(req.body);
  if (data.project) await findProjectOr404(data.project, req.user._id);
  if (data.status && data.status !== before) data.order = await orderFor(data.project || task.project, data.status);
  task.set(data);
  await task.save();
  if (task.status !== before) await logStatusChange(task, before);
  await respondTask(res, task);
}

async function logStatusChange(task, from) {
  const project = await Project.findById(task.project).lean();
  if (task.status === 'done') await logActivity('task_completed', { task, project, from, to: 'done' });
  else if (from === 'done') await logActivity('task_reopened', { task, project, from, to: task.status });
  else await logActivity('task_moved', { task, project, from, to: task.status });
}

// PATCH /api/tasks/:id/toggle  (xong <-> chưa xong)
export async function toggleTask(req, res) {
  const task = await findTaskOr404(req.params.id, req.user._id);
  const before = task.status;
  task.status = before === 'done' ? 'todo' : 'done';
  task.order = await orderFor(task.project, task.status);
  await task.save();
  await logStatusChange(task, before);
  await respondTask(res, task);
}

// POST /api/tasks/:id/move  { status, index }  kéo thả trên bảng Kanban
export async function moveTask(req, res) {
  const task = await findTaskOr404(req.params.id, req.user._id);
  const { status = task.status } = req.body;
  if (!STATUSES.includes(status)) {
    const err = new Error('Trạng thái không hợp lệ');
    err.status = 400;
    throw err;
  }
  const before = task.status;

  // Lấy các task khác trong cột đích theo thứ tự hiện tại, chèn task vào vị trí index
  const column = await Task.find({ owner: task.owner, project: task.project, status, _id: { $ne: task._id } })
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

  if (status !== before) await logStatusChange(task, before);
  await respondTask(res, task);
}

// DELETE /api/tasks/:id
export async function deleteTask(req, res) {
  const task = await findTaskOr404(req.params.id, req.user._id);
  await task.deleteOne();
  const project = await Project.findById(task.project).lean();
  await logActivity('task_deleted', { task, project });
  res.json({ data: { _id: task._id } });
}

// DELETE /api/tasks?status=done&project=<id>  (dọn việc đã xong)
export async function clearDone(req, res) {
  if (req.query.status !== 'done') {
    const err = new Error('Chỉ hỗ trợ xoá hàng loạt với ?status=done');
    err.status = 400;
    throw err;
  }
  if (!mongoose.isValidObjectId(req.query.project)) {
    const err = new Error('Thiếu hoặc sai mã dự án');
    err.status = 400;
    throw err;
  }
  const filter = { owner: req.user._id, status: 'done', project: req.query.project };
  const { deletedCount } = await Task.deleteMany(filter);
  res.json({ data: { deletedCount } });
}

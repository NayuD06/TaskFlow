import { buildExport, parseImport, tasksToCsv } from '../lib/portable.js';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { logActivity } from '../services/activity.js';

const stamp = (d = new Date()) => d.toISOString().slice(0, 10);

// GET /api/export?format=json|csv&lang=vi|en
// Chỉ xuất dự án của chính mình (dự án được mời vào thuộc về người khác).
export async function exportData(req, res) {
  const owner = req.user._id;
  const projects = await Project.find({ owner }).sort({ createdAt: 1 }).lean();
  const tasks = await Task.find({ project: { $in: projects.map((p) => p._id) } })
    .sort({ project: 1, status: 1, order: 1 })
    .lean();

  res.set('Cache-Control', 'no-store');
  if (req.query.format === 'csv') {
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="taskflow-${stamp()}.csv"`);
    return res.send(tasksToCsv(projects, tasks, req.query.lang === 'en' ? 'en' : 'vi'));
  }
  res.set('Content-Disposition', `attachment; filename="taskflow-${stamp()}.json"`);
  res.json(buildExport({ user: req.user, projects, tasks }));
}

// POST /api/import  (nội dung file JSON đã xuất). Luôn thêm mới, không ghi đè dữ liệu đang có.
export async function importData(req, res) {
  if (req.user.isDemo) {
    const err = new Error('Tài khoản demo dùng chung nên không nhập dữ liệu được. Hãy tự đăng ký một tài khoản nhé.');
    err.status = 403;
    throw err;
  }
  const { projects } = parseImport(req.body);
  const owner = req.user._id;
  let taskTotal = 0;
  const created = [];
  for (const p of projects) {
    const project = await Project.create({ name: p.name, description: p.description, color: p.color, archived: p.archived, owner });
    created.push(project);
    const order = { todo: 0, doing: 0, done: 0 };
    const docs = p.tasks.map((t) => ({ ...t, owner, createdBy: owner, project: project._id, order: order[t.status]++ }));
    if (docs.length) await Task.insertMany(docs);
    taskTotal += docs.length;
    await logActivity('project_created', { project, actor: req.user });
  }
  res.status(201).json({ data: { projects: created.length, tasks: taskTotal, projectIds: created.map((p) => p._id) } });
}

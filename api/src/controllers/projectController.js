import mongoose from 'mongoose';
import { projectStats, withProjectStats } from '../lib/stats.js';
import { Activity } from '../models/Activity.js';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { logActivity } from '../services/activity.js';
import { pickProjectFields } from './taskQuery.js';

function notFound() {
  const err = new Error('Không tìm thấy dự án');
  err.status = 404;
  return err;
}

/** Chỉ tìm trong dự án của chính người dùng; dự án của người khác coi như không tồn tại. */
export async function findProjectOr404(id, owner) {
  if (!mongoose.isValidObjectId(id)) throw notFound();
  const project = await Project.findOne({ _id: id, owner });
  if (!project) throw notFound();
  return project;
}

const statsOf = async (project) =>
  projectStats(await Task.find({ owner: project.owner, project: project._id }, { status: 1, deadline: 1 }).lean());

// GET /api/projects?archived=true|false|all
export async function listProjects(req, res) {
  const owner = req.user._id;
  const { archived = 'false' } = req.query;
  const filter = archived === 'all' ? { owner } : { owner, archived: archived === 'true' };
  const projects = await Project.find(filter).sort({ updatedAt: -1 }).lean();
  const tasks = await Task.find({ owner, project: { $in: projects.map((p) => p._id) } }, { project: 1, status: 1, deadline: 1 }).lean();
  res.json({ data: withProjectStats(projects, tasks) });
}

// GET /api/projects/:id
export async function getProject(req, res) {
  const project = await findProjectOr404(req.params.id, req.user._id);
  res.json({ data: { ...project.toObject(), stats: await statsOf(project) } });
}

// POST /api/projects
export async function createProject(req, res) {
  const project = await Project.create({ ...pickProjectFields(req.body), owner: req.user._id });
  await logActivity('project_created', { project });
  res.status(201).json({ data: { ...project.toObject(), stats: projectStats([]) } });
}

// PATCH /api/projects/:id
export async function updateProject(req, res) {
  const project = await findProjectOr404(req.params.id, req.user._id);
  project.set(pickProjectFields(req.body));
  await project.save();
  res.json({ data: { ...project.toObject(), stats: await statsOf(project) } });
}

// DELETE /api/projects/:id  (xoá luôn các task bên trong)
export async function deleteProject(req, res) {
  const owner = req.user._id;
  const project = await findProjectOr404(req.params.id, owner);
  const { deletedCount } = await Task.deleteMany({ owner, project: project._id });
  await Activity.deleteMany({ owner, project: project._id });
  await project.deleteOne();
  res.json({ data: { _id: project._id, deletedTasks: deletedCount } });
}

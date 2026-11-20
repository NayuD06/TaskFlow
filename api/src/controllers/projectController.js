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

export async function findProjectOr404(id) {
  if (!mongoose.isValidObjectId(id)) throw notFound();
  const project = await Project.findById(id);
  if (!project) throw notFound();
  return project;
}

// GET /api/projects?archived=true|false|all
export async function listProjects(req, res) {
  const { archived = 'false' } = req.query;
  const filter = archived === 'all' ? {} : { archived: archived === 'true' };
  const projects = await Project.find(filter).sort({ updatedAt: -1 }).lean();
  const tasks = await Task.find(
    { project: { $in: projects.map((p) => p._id) } },
    { project: 1, status: 1, deadline: 1 }
  ).lean();
  res.json({ data: withProjectStats(projects, tasks) });
}

// GET /api/projects/:id
export async function getProject(req, res) {
  const project = await findProjectOr404(req.params.id);
  const tasks = await Task.find({ project: project._id }, { status: 1, deadline: 1 }).lean();
  res.json({ data: { ...project.toObject(), stats: projectStats(tasks) } });
}

// POST /api/projects
export async function createProject(req, res) {
  const project = await Project.create(pickProjectFields(req.body));
  await logActivity('project_created', { project });
  res.status(201).json({ data: { ...project.toObject(), stats: projectStats([]) } });
}

// PATCH /api/projects/:id
export async function updateProject(req, res) {
  const project = await findProjectOr404(req.params.id);
  project.set(pickProjectFields(req.body));
  await project.save();
  const tasks = await Task.find({ project: project._id }, { status: 1, deadline: 1 }).lean();
  res.json({ data: { ...project.toObject(), stats: projectStats(tasks) } });
}

// DELETE /api/projects/:id  (xoá luôn các task bên trong)
export async function deleteProject(req, res) {
  const project = await findProjectOr404(req.params.id);
  const { deletedCount } = await Task.deleteMany({ project: project._id });
  await Activity.deleteMany({ project: project._id });
  await project.deleteOne();
  res.json({ data: { _id: project._id, deletedTasks: deletedCount } });
}

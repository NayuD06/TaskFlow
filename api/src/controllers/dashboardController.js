import { computeDashboard } from '../lib/stats.js';
import { parseTzOffset } from '../lib/time.js';
import { Activity } from '../models/Activity.js';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { accessFilter } from '../services/access.js';

// GET /api/dashboard?tzOffset=-420  (gồm cả dự án được mời vào)
export async function getDashboard(req, res) {
  const projects = await Project.find(accessFilter(req.user._id)).lean();
  const tasks = await Task.find({ project: { $in: projects.map((p) => p._id) } }).lean();
  const data = computeDashboard({ tasks, projects, tzOffset: parseTzOffset(req.query.tzOffset) });
  res.json({ data });
}

const ACTIVITY_FILTERS = {
  all: {},
  completed: { type: { $in: ['task_completed', 'pomodoro_completed'] } },
  created: { type: { $in: ['task_created', 'project_created'] } },
  team: { type: { $in: ['task_commented', 'member_joined'] } },
};

// GET /api/activity?type=all|completed|created|team&limit=30
// Hoạt động của mọi dự án mình được vào (kể cả việc thành viên khác làm)
export async function listActivity(req, res) {
  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
  const filter = ACTIVITY_FILTERS[req.query.type] || ACTIVITY_FILTERS.all;
  const projectIds = await Project.find(accessFilter(req.user._id)).distinct('_id');
  const scope = { $or: [{ owner: req.user._id }, { project: { $in: projectIds } }] };
  const items = await Activity.find({ ...filter, ...scope }).sort({ createdAt: -1 }).limit(limit).lean();
  const me = String(req.user._id);
  res.json({ data: items.map((a) => ({ ...a, mine: !a.actor || String(a.actor) === me })) });
}

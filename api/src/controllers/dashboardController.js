import { computeDashboard } from '../lib/stats.js';
import { parseTzOffset } from '../lib/time.js';
import { Activity } from '../models/Activity.js';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';

// GET /api/dashboard?tzOffset=-420
export async function getDashboard(req, res) {
  const [projects, tasks] = await Promise.all([Project.find().lean(), Task.find().lean()]);
  const data = computeDashboard({ tasks, projects, tzOffset: parseTzOffset(req.query.tzOffset) });
  res.json({ data });
}

const ACTIVITY_FILTERS = {
  all: {},
  completed: { type: 'task_completed' },
  created: { type: { $in: ['task_created', 'project_created'] } },
};

// GET /api/activity?type=all|completed|created&limit=30
export async function listActivity(req, res) {
  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
  const filter = ACTIVITY_FILTERS[req.query.type] || ACTIVITY_FILTERS.all;
  const items = await Activity.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  res.json({ data: items });
}

// Trang quản trị: thống kê hệ thống, quản lý người dùng và ảnh đã lưu trên Cloudinary.
// Mọi route ở đây đã qua requireAuth + requireAdmin.
import mongoose from 'mongoose';
import { env, isTest } from '../config/env.js';
import { invalid } from '../lib/validate.js';
import { parseTzOffset, dayIndex, dayStart } from '../lib/time.js';
import { Activity } from '../models/Activity.js';
import { Comment } from '../models/Comment.js';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { User, isAdmin, isEnvAdmin } from '../models/User.js';
import { deleteUserData } from '../services/accounts.js';
import { cloudinaryAdminReady, deleteImages, getUsage, isOwnPublicId, listImages, publicIdFromUrl } from '../services/cloudinary.js';

const DAY_MS = 24 * 3600 * 1000;

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const toInt = (v, def, min, max) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};

/** Biến môi trường nào đã được cấu hình (chỉ trả đúng/sai, không bao giờ trả giá trị). */
export function integrations() {
  return {
    mail: !!(env.mail.from && (env.mail.brevoKey || env.mail.resendKey)),
    google: !!env.googleClientId,
    uploads: !!(env.cloudinary.cloudName && env.cloudinary.uploadPreset),
    cloudinaryAdmin: cloudinaryAdminReady(),
    sentry: !!env.sentryDsn && !isTest,
    adminEmails: env.adminEmails.length,
  };
}

// GET /api/admin/stats?tzOffset=-420
export async function getStats(req, res) {
  const tz = parseTzOffset(req.query.tzOffset);
  const now = new Date();
  const weekAgo = new Date(now - 7 * DAY_MS);
  const today = dayIndex(now, tz);
  const from = dayStart(today - 13, tz);
  const adminFilter = { $or: [{ role: 'admin' }, { email: { $in: env.adminEmails } }] };

  const [
    users,
    newUsers,
    activeUsers,
    admins,
    disabled,
    google,
    projects,
    sharedProjects,
    archivedProjects,
    tasks,
    doneTasks,
    overdueTasks,
    recurringTasks,
    comments,
    taskSums,
    signups,
    completions,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: weekAgo } }),
    User.countDocuments({ lastLoginAt: { $gte: weekAgo } }),
    User.countDocuments(adminFilter),
    User.countDocuments({ disabled: true }),
    User.countDocuments({ googleId: { $exists: true, $ne: null } }),
    Project.countDocuments(),
    Project.countDocuments({ 'members.0': { $exists: true } }),
    Project.countDocuments({ archived: true }),
    Task.countDocuments(),
    Task.countDocuments({ status: 'done' }),
    Task.countDocuments({ status: { $ne: 'done' }, deadline: { $ne: null, $lt: now } }),
    Task.countDocuments({ repeat: { $nin: [null, 'none'] } }),
    Comment.countDocuments(),
    Task.aggregate([
      {
        $group: {
          _id: null,
          images: { $sum: { $size: { $ifNull: ['$attachments', []] } } },
          imageBytes: { $sum: { $sum: { $ifNull: ['$attachments.bytes', []] } } },
          pomodoros: { $sum: { $ifNull: ['$pomodoros', 0] } },
          focusMinutes: { $sum: { $ifNull: ['$focusMinutes', 0] } },
        },
      },
    ]),
    User.find({ createdAt: { $gte: from } }, { createdAt: 1 }).lean(),
    Task.find({ completedAt: { $gte: from } }, { completedAt: 1 }).lean(),
  ]);

  const days = Array.from({ length: 14 }, (_, i) => ({ date: dayStart(today - 13 + i, tz).toISOString(), signups: 0, completed: 0 }));
  for (const u of signups) {
    const i = dayIndex(u.createdAt, tz) - (today - 13);
    if (days[i]) days[i].signups += 1;
  }
  for (const t of completions) {
    const i = dayIndex(t.completedAt, tz) - (today - 13);
    if (days[i]) days[i].completed += 1;
  }
  const sums = taskSums[0] || { images: 0, imageBytes: 0, pomodoros: 0, focusMinutes: 0 };

  res.json({
    data: {
      users: { total: users, new7d: newUsers, active7d: activeUsers, admins, disabled, google },
      projects: { total: projects, shared: sharedProjects, archived: archivedProjects },
      tasks: { total: tasks, done: doneTasks, overdue: overdueTasks, recurring: recurringTasks },
      comments,
      images: { total: sums.images, bytes: sums.imageBytes },
      focus: { pomodoros: sums.pomodoros, minutes: sums.focusMinutes },
      days,
      integrations: integrations(),
    },
  });
}

function presentUser(u, counts) {
  return {
    _id: u._id,
    name: u.name,
    email: u.email,
    avatar: u.avatar || '',
    avatarColor: u.avatarColor || 'blue',
    role: isAdmin(u) ? 'admin' : 'user',
    envAdmin: isEnvAdmin(u),
    disabled: !!u.disabled,
    disabledAt: u.disabledAt || null,
    isDemo: !!u.isDemo,
    hasPassword: u.passwordSet !== false,
    google: !!u.googleId,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt || null,
    projects: counts?.projects ?? 0,
    tasks: counts?.tasks ?? 0,
  };
}

async function countsFor(ids) {
  const [projects, tasks] = await Promise.all([
    Project.aggregate([{ $match: { owner: { $in: ids } } }, { $group: { _id: '$owner', n: { $sum: 1 } } }]),
    Task.aggregate([{ $match: { owner: { $in: ids } } }, { $group: { _id: '$owner', n: { $sum: 1 } } }]),
  ]);
  const map = new Map(ids.map((id) => [String(id), { projects: 0, tasks: 0 }]));
  for (const p of projects) map.get(String(p._id)).projects = p.n;
  for (const t of tasks) map.get(String(t._id)).tasks = t.n;
  return map;
}

const USER_FILTERS = {
  all: () => ({}),
  admin: () => ({ $or: [{ role: 'admin' }, { email: { $in: env.adminEmails } }] }),
  disabled: () => ({ disabled: true }),
  google: () => ({ googleId: { $exists: true, $ne: null } }),
  demo: () => ({ isDemo: true }),
};
const USER_SORTS = { newest: { createdAt: -1 }, active: { lastLoginAt: -1, createdAt: -1 }, name: { name: 1 } };

// GET /api/admin/users?q=&filter=all|admin|disabled|google|demo&sort=newest|active|name&page=1&limit=20
export async function listUsers(req, res) {
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : '';
  const filter = USER_FILTERS[req.query.filter] ? req.query.filter : 'all';
  const sort = USER_SORTS[req.query.sort] ? req.query.sort : 'newest';
  const page = toInt(req.query.page, 1, 1, 10_000);
  const limit = toInt(req.query.limit, 20, 1, 100);

  const where = { ...USER_FILTERS[filter]() };
  if (q) {
    const re = new RegExp(escapeRegex(q), 'i');
    where.$and = [{ $or: [{ name: re }, { email: re }] }];
  }
  const [total, users] = await Promise.all([
    User.countDocuments(where),
    User.find(where)
      .select('+googleId')
      .sort(USER_SORTS[sort])
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);
  const counts = await countsFor(users.map((u) => u._id));
  res.json({ data: users.map((u) => presentUser(u, counts.get(String(u._id)))), total, page, limit });
}

async function loadTarget(req) {
  if (!mongoose.isValidObjectId(req.params.id)) throw httpError(404, 'Không tìm thấy người dùng');
  const user = await User.findById(req.params.id).select('+googleId +tokenVersion');
  if (!user) throw httpError(404, 'Không tìm thấy người dùng');
  if (String(user._id) === String(req.user._id)) throw invalid({ user: 'Bạn không thể tự khoá, xoá hay đổi quyền của chính mình' });
  return user;
}

// PATCH /api/admin/users/:id  { disabled?: boolean, role?: 'user' | 'admin' }
export async function updateUser(req, res) {
  const user = await loadTarget(req);
  const { disabled, role } = req.body ?? {};
  if (disabled === undefined && role === undefined) throw invalid({ user: 'Không có gì để thay đổi' });
  if (disabled !== undefined && typeof disabled !== 'boolean') throw invalid({ disabled: 'Giá trị không hợp lệ' });
  if (role !== undefined && !['user', 'admin'].includes(role)) throw invalid({ role: 'Quyền không hợp lệ' });
  if (isEnvAdmin(user)) {
    throw invalid({ user: 'Tài khoản này là quản trị viên qua biến ADMIN_EMAILS. Hãy sửa biến đó trên máy chủ nếu muốn đổi.' });
  }

  if (role !== undefined) user.role = role;
  if (disabled !== undefined && disabled !== !!user.disabled) {
    user.disabled = disabled;
    user.disabledAt = disabled ? new Date() : null;
    // Khoá thì đăng xuất mọi thiết bị luôn, mở khoá cũng không làm sống lại token cũ
    if (disabled) user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  }
  await user.save();
  const counts = await countsFor([user._id]);
  res.json({ data: presentUser(user, counts.get(String(user._id))) });
}

// DELETE /api/admin/users/:id  xoá hẳn tài khoản và dữ liệu của họ
export async function deleteUser(req, res) {
  const user = await loadTarget(req);
  if (isEnvAdmin(user)) throw invalid({ user: 'Không xoá được quản trị viên trong ADMIN_EMAILS' });
  if (user.isDemo) throw invalid({ user: 'Không xoá tài khoản demo, nếu cần hãy khoá tạm thời' });
  const result = await deleteUserData(user._id);
  res.json({ data: { _id: user._id, deletedProjects: result.projects, deletedTasks: result.tasks } });
}

/** Ảnh đang được dùng ở đâu: thẻ công việc nào, ảnh đại diện của ai. */
async function usageMap() {
  const [tasks, users] = await Promise.all([
    Task.find({ 'attachments.0': { $exists: true } }, { title: 1, project: 1, owner: 1, attachments: 1 })
      .populate('project', 'name color')
      .populate('owner', 'name email')
      .lean(),
    User.find({ avatar: /^https:\/\/res\.cloudinary\.com\// }, { name: 1, email: 1, avatar: 1 }).lean(),
  ]);
  const map = new Map();
  const add = (id, entry) => {
    if (!id) return;
    if (!map.has(id)) map.set(id, []);
    map.get(id).push(entry);
  };
  for (const t of tasks) {
    for (const a of t.attachments) {
      add(a.publicId || publicIdFromUrl(a.url), {
        kind: 'task',
        taskId: t._id,
        title: t.title,
        projectId: t.project?._id ?? null,
        projectName: t.project?.name ?? '',
        projectColor: t.project?.color ?? 'blue',
        ownerName: t.owner?.name ?? '',
        ownerEmail: t.owner?.email ?? '',
      });
    }
  }
  for (const u of users) add(publicIdFromUrl(u.avatar), { kind: 'avatar', userId: u._id, name: u.name, email: u.email });
  return map;
}

const IMAGE_FILTERS = { all: () => true, used: (img) => img.usage.length > 0, unused: (img) => img.usage.length === 0 };
const KINDS = {
  all: () => true,
  tasks: (img) => img.folder.startsWith('tasks'),
  avatars: (img) => img.folder.startsWith('avatars'),
  other: (img) => !img.folder.startsWith('tasks') && !img.folder.startsWith('avatars'),
};

// GET /api/admin/images?filter=all|used|unused&kind=all|tasks|avatars|other&q=&page=1&limit=48&refresh=1
export async function listCloudImages(req, res) {
  if (!cloudinaryAdminReady()) {
    return res.json({ data: { configured: false, cloudName: env.cloudinary.cloudName || '', items: [], total: 0, totals: null, usage: null } });
  }
  const filter = IMAGE_FILTERS[req.query.filter] ? req.query.filter : 'all';
  const kind = KINDS[req.query.kind] ? req.query.kind : 'all';
  const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase().slice(0, 80) : '';
  const page = toInt(req.query.page, 1, 1, 1000);
  const limit = toInt(req.query.limit, 48, 1, 200);
  const refresh = req.query.refresh === '1' || req.query.refresh === 'true';

  const [{ images, truncated, fetchedAt }, usage, uses] = await Promise.all([listImages({ refresh }), page === 1 ? getUsage() : null, usageMap()]);
  const all = images.map((img) => ({ ...img, usage: uses.get(img.publicId) || [] }));
  const unused = all.filter(IMAGE_FILTERS.unused);
  const totals = {
    count: all.length,
    bytes: all.reduce((s, i) => s + i.bytes, 0),
    used: all.length - unused.length,
    unused: unused.length,
    unusedBytes: unused.reduce((s, i) => s + i.bytes, 0),
    tasks: all.filter(KINDS.tasks).length,
    avatars: all.filter(KINDS.avatars).length,
  };
  const matches = (img) =>
    !q ||
    img.publicId.toLowerCase().includes(q) ||
    img.usage.some((u) => [u.title, u.projectName, u.ownerName, u.ownerEmail, u.name, u.email].some((v) => v && v.toLowerCase().includes(q)));
  const list = all.filter((img) => IMAGE_FILTERS[filter](img) && KINDS[kind](img) && matches(img));

  res.json({
    data: {
      configured: true,
      cloudName: env.cloudinary.cloudName,
      folder: 'taskflow',
      items: list.slice((page - 1) * limit, page * limit),
      total: list.length,
      page,
      limit,
      totals,
      usage,
      truncated,
      fetchedAt,
    },
  });
}

// DELETE /api/admin/images  { publicIds: [...], force?: boolean }
// Ảnh đang dùng chỉ xoá khi force = true: gỡ khỏi thẻ công việc và đặt lại ảnh đại diện trước khi xoá trên Cloudinary.
export async function deleteCloudImages(req, res) {
  if (!cloudinaryAdminReady()) throw httpError(503, 'Máy chủ chưa có CLOUDINARY_API_KEY và CLOUDINARY_API_SECRET');
  const raw = req.body?.publicIds;
  if (!Array.isArray(raw) || raw.length === 0) throw invalid({ publicIds: 'Hãy chọn ít nhất một ảnh' });
  if (raw.length > 500) throw invalid({ publicIds: 'Mỗi lần xoá tối đa 500 ảnh' });
  const ids = [...new Set(raw.filter((id) => typeof id === 'string'))];
  if (ids.some((id) => !isOwnPublicId(id))) throw invalid({ publicIds: 'Chỉ xoá được ảnh trong thư mục taskflow/' });
  const force = req.body?.force === true;

  const uses = await usageMap();
  const inUse = ids.filter((id) => uses.has(id));
  if (inUse.length && !force) {
    const err = httpError(409, inUse.length === 1 ? 'Ảnh này đang được dùng' : `${inUse.length} ảnh đang được dùng`);
    err.fields = { publicIds: 'Xác nhận xoá cả ảnh đang dùng để gỡ chúng khỏi công việc và ảnh đại diện' };
    throw err;
  }

  let detached = 0;
  let avatarsCleared = 0;
  if (inUse.length) {
    const set = new Set(inUse);
    const taskIds = [...new Set(inUse.flatMap((id) => uses.get(id).filter((u) => u.kind === 'task').map((u) => String(u.taskId))))];
    for (const task of await Task.find({ _id: { $in: taskIds } })) {
      const before = task.attachments.length;
      task.attachments = task.attachments.filter((a) => !set.has(a.publicId || publicIdFromUrl(a.url)));
      detached += before - task.attachments.length;
      await task.save();
    }
    const userIds = inUse.flatMap((id) => uses.get(id).filter((u) => u.kind === 'avatar').map((u) => u.userId));
    if (userIds.length) avatarsCleared = (await User.updateMany({ _id: { $in: userIds } }, { $set: { avatar: '' } })).modifiedCount;
  }

  const { deleted, notFound } = await deleteImages(ids);
  res.json({ data: { deleted, notFound, detached, avatarsCleared } });
}

// GET /api/admin/activity?limit=20  hoạt động mới nhất trên toàn hệ thống
export async function recentActivity(req, res) {
  const limit = toInt(req.query.limit, 20, 1, 100);
  const items = await Activity.find().sort({ createdAt: -1 }).limit(limit).lean();
  res.json({ data: items });
}

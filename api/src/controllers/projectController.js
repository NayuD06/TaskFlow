import { env } from '../config/env.js';
import { invalid, validateInvite } from '../lib/validate.js';
import { projectStats, withProjectStats } from '../lib/stats.js';
import { Activity } from '../models/Activity.js';
import { Comment } from '../models/Comment.js';
import { MAX_MEMBERS, Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { User, memberCard } from '../models/User.js';
import { accessFilter, findProjectOr404, isOwner, roleOf } from '../services/access.js';
import { logActivity } from '../services/activity.js';
import { projectInviteEmail } from '../services/emails.js';
import { sendMail } from '../services/mailer.js';
import { pickProjectFields } from './taskQuery.js';

export { findProjectOr404 };

const idOf = (v) => String(v?._id ?? v);

function blockDemo(user) {
  if (!user.isDemo) return;
  const err = new Error('Tài khoản demo dùng chung nên không mời hay xoá thành viên được. Hãy tự đăng ký một tài khoản nhé.');
  err.status = 403;
  throw err;
}

/** Thẻ người dùng (tên, ảnh) của chủ dự án và các thành viên, để hiện chồng ảnh đại diện. */
async function peopleOf(projects) {
  const ids = new Set();
  for (const p of projects) {
    ids.add(idOf(p.owner));
    for (const m of p.members || []) ids.add(idOf(m.user));
  }
  const users = await User.find({ _id: { $in: [...ids] } }, { name: 1, avatar: 1, avatarColor: 1 }).lean();
  return new Map(users.map((u) => [idOf(u._id), memberCard(u)]));
}

/** Dữ liệu dự án gửi cho client: thêm vai trò của người xem, người trong dự án; giấu email được mời với thành viên. */
function present(project, userId, people, stats) {
  const p = project.toObject ? project.toObject() : project;
  const owner = isOwner(p, userId);
  const members = (p.members || []).map((m) => people.get(idOf(m.user))).filter(Boolean);
  const { invites, ...rest } = p;
  return {
    ...rest,
    members,
    ownerInfo: people.get(idOf(p.owner)) || null,
    role: owner ? 'owner' : 'member',
    shared: members.length > 0 || (owner && (invites || []).length > 0),
    ...(owner ? { inviteCount: (invites || []).length } : {}),
    stats,
  };
}

const statsOf = async (project) => projectStats(await Task.find({ project: project._id }, { status: 1, deadline: 1 }).lean());

async function respond(res, project, userId, status = 200) {
  const people = await peopleOf([project]);
  res.status(status).json({ data: present(project, userId, people, await statsOf(project)) });
}

// GET /api/projects?archived=true|false|all
export async function listProjects(req, res) {
  const userId = req.user._id;
  const { archived = 'false' } = req.query;
  const filter = archived === 'all' ? accessFilter(userId) : { ...accessFilter(userId), archived: archived === 'true' };
  const projects = await Project.find(filter).sort({ updatedAt: -1 }).lean();
  const [tasks, people] = await Promise.all([
    Task.find({ project: { $in: projects.map((p) => p._id) } }, { project: 1, status: 1, deadline: 1 }).lean(),
    peopleOf(projects),
  ]);
  const withStats = withProjectStats(projects, tasks);
  res.json({ data: withStats.map((p) => present(p, userId, people, p.stats)) });
}

// GET /api/projects/:id
export async function getProject(req, res) {
  const project = await findProjectOr404(req.params.id, req.user._id);
  await respond(res, project, req.user._id);
}

// POST /api/projects
export async function createProject(req, res) {
  const project = await Project.create({ ...pickProjectFields(req.body), owner: req.user._id });
  await logActivity('project_created', { project, actor: req.user });
  const people = await peopleOf([project]);
  res.status(201).json({ data: present(project, req.user._id, people, projectStats([])) });
}

// PATCH /api/projects/:id  (chỉ chủ dự án)
export async function updateProject(req, res) {
  const project = await findProjectOr404(req.params.id, req.user._id, { owner: true });
  project.set(pickProjectFields(req.body));
  await project.save();
  await respond(res, project, req.user._id);
}

// DELETE /api/projects/:id  (chỉ chủ dự án, xoá luôn công việc, bình luận, hoạt động bên trong)
export async function deleteProject(req, res) {
  const project = await findProjectOr404(req.params.id, req.user._id, { owner: true });
  const { deletedCount } = await Task.deleteMany({ project: project._id });
  await Promise.all([Activity.deleteMany({ project: project._id }), Comment.deleteMany({ project: project._id })]);
  await project.deleteOne();
  res.json({ data: { _id: project._id, deletedTasks: deletedCount } });
}

/* ---------- Thành viên ---------- */

async function membersPayload(project, userId) {
  const ids = [project.owner, ...project.members.map((m) => m.user)];
  const users = await User.find({ _id: { $in: ids } }).lean();
  const byId = new Map(users.map((u) => [idOf(u._id), u]));
  const card = (u) => (u ? { ...memberCard(u), email: u.email } : null);
  return {
    role: roleOf(project, userId),
    owner: card(byId.get(idOf(project.owner))),
    members: project.members
      .map((m) => (byId.get(idOf(m.user)) ? { ...card(byId.get(idOf(m.user))), addedAt: m.addedAt } : null))
      .filter(Boolean),
    // Chỉ chủ dự án thấy danh sách email đang chờ
    invites: isOwner(project, userId) ? project.invites.map((i) => ({ email: i.email, invitedAt: i.invitedAt })) : [],
  };
}

// GET /api/projects/:id/members
export async function listMembers(req, res) {
  const project = await findProjectOr404(req.params.id, req.user._id);
  res.json({ data: await membersPayload(project, req.user._id) });
}

// POST /api/projects/:id/members  { email }  (chỉ chủ dự án)
export async function addMember(req, res) {
  blockDemo(req.user);
  const project = await findProjectOr404(req.params.id, req.user._id, { owner: true });
  const { email } = validateInvite(req.body);
  if (email === req.user.email) throw invalid({ email: 'Bạn đã là chủ dự án này' });
  if (project.members.length + project.invites.length >= MAX_MEMBERS) throw invalid({ email: `Mỗi dự án tối đa ${MAX_MEMBERS} người` });

  const user = await User.findOne({ email }).lean();
  let result;
  if (user) {
    if (project.members.some((m) => idOf(m.user) === idOf(user._id))) throw invalid({ email: 'Người này đã ở trong dự án' });
    project.members.push({ user: user._id, addedAt: new Date() });
    result = 'added';
  } else {
    if (project.invites.some((i) => i.email === email)) throw invalid({ email: 'Đã gửi lời mời tới email này rồi' });
    project.invites.push({ email, invitedAt: new Date() });
    result = 'invited';
  }
  await project.save();
  if (user) await logActivity('member_joined', { project, actor: user });

  const link = user ? `${env.appUrl}/projects/${project._id}` : `${env.appUrl}/register?email=${encodeURIComponent(email)}`;
  const mail = projectInviteEmail({ inviterName: req.user.name, projectName: project.name, link, hasAccount: !!user });
  const emailSent = await sendMail({ to: email, ...mail });

  res.status(201).json({ data: { ...(await membersPayload(project, req.user._id)), result, emailSent } });
}

// DELETE /api/projects/:id/members/:userId  (chủ dự án xoá thành viên, hoặc thành viên tự rời dự án)
export async function removeMember(req, res) {
  const project = await findProjectOr404(req.params.id, req.user._id);
  const target = req.params.userId;
  const leaving = target === idOf(req.user._id);
  if (!leaving && !isOwner(project, req.user._id)) {
    const err = new Error('Chỉ chủ dự án mới xoá được thành viên');
    err.status = 403;
    throw err;
  }
  if (leaving && isOwner(project, req.user._id)) throw invalid({ user: 'Chủ dự án không thể rời dự án của mình' });
  if (!leaving) blockDemo(req.user);
  const before = project.members.length;
  project.members = project.members.filter((m) => idOf(m.user) !== target);
  if (project.members.length === before) {
    const err = new Error('Người này không ở trong dự án');
    err.status = 404;
    throw err;
  }
  await project.save();
  res.json({ data: leaving ? { left: true } : await membersPayload(project, req.user._id) });
}

// DELETE /api/projects/:id/invites?email=...  (chủ dự án huỷ lời mời đang chờ)
export async function cancelInvite(req, res) {
  const project = await findProjectOr404(req.params.id, req.user._id, { owner: true });
  const email = String(req.query.email || '').trim().toLowerCase();
  project.invites = project.invites.filter((i) => i.email !== email);
  await project.save();
  res.json({ data: await membersPayload(project, req.user._id) });
}


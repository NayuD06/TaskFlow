// Quyền truy cập dự án: chủ dự án và thành viên được mời đều xem, sửa công việc được.
// Chỉ chủ dự án mới sửa thông tin dự án, lưu trữ, xoá và quản lý thành viên.
import mongoose from 'mongoose';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { logActivity } from './activity.js';

function notFound(what = 'dự án') {
  const err = new Error(`Không tìm thấy ${what}`);
  err.status = 404;
  return err;
}

function forbidden(message = 'Chỉ chủ dự án mới làm được việc này') {
  const err = new Error(message);
  err.status = 403;
  return err;
}

const idOf = (v) => String(v?._id ?? v);

/** Điều kiện Mongo: dự án mà userId là chủ hoặc thành viên. */
export const accessFilter = (userId) => ({ $or: [{ owner: userId }, { 'members.user': userId }] });

export async function accessibleProjectIds(userId) {
  return Project.find(accessFilter(userId)).distinct('_id');
}

export const isOwner = (project, userId) => idOf(project.owner) === idOf(userId);
export const roleOf = (project, userId) => (isOwner(project, userId) ? 'owner' : 'member');

/**
 * Tìm dự án người dùng được vào. Dự án của người khác coi như không tồn tại (404).
 * owner: true -> thành viên vào được nhưng thao tác này chỉ chủ dự án làm được (403).
 */
export async function findProjectOr404(id, userId, { owner = false } = {}) {
  if (!mongoose.isValidObjectId(id)) throw notFound();
  const project = await Project.findOne({ _id: id, ...accessFilter(userId) });
  if (!project) throw notFound();
  if (owner && !isOwner(project, userId)) throw forbidden();
  return project;
}

/** Tìm công việc trong các dự án người dùng được vào. Trả về { task, project }. */
export async function findTaskOr404(id, userId) {
  if (!mongoose.isValidObjectId(id)) throw notFound('công việc');
  const task = await Task.findById(id);
  if (!task) throw notFound('công việc');
  const project = await Project.findOne({ _id: task.project, ...accessFilter(userId) });
  if (!project) throw notFound('công việc');
  return { task, project };
}

/** Người vừa đăng ký: nhận các lời mời đang chờ gửi tới email này. */
export async function claimInvites(user) {
  const projects = await Project.find({ 'invites.email': user.email });
  for (const project of projects) {
    project.invites = project.invites.filter((i) => i.email !== user.email);
    if (!project.members.some((m) => idOf(m.user) === idOf(user._id)) && !isOwner(project, user._id)) {
      project.members.push({ user: user._id, addedAt: new Date() });
    }
    await project.save();
    await logActivity('member_joined', { project, actor: user });
  }
  return projects.length;
}

import { Activity } from '../models/Activity.js';

/**
 * Ghi một dòng hoạt động. Không bao giờ làm hỏng request chính nếu ghi lỗi.
 * owner: chủ dự án (mặc định lấy từ project/task); actor: người thực hiện.
 */
export async function logActivity(type, { task, project, owner, actor, from = null, to = null } = {}) {
  try {
    await Activity.create({
      owner: owner ?? project?.owner ?? task?.owner ?? actor?._id,
      actor: actor?._id ?? null,
      actorName: actor?.name ?? '',
      type,
      task: task?._id ?? null,
      taskTitle: task?.title ?? '',
      project: project?._id ?? null,
      projectName: project?.name ?? '',
      projectColor: project?.color ?? 'blue',
      from,
      to,
    });
  } catch (err) {
    console.warn('[activity] Không ghi được hoạt động:', err.message);
  }
}

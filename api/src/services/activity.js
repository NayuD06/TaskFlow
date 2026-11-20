import { Activity } from '../models/Activity.js';

/** Ghi một dòng hoạt động. Không bao giờ làm hỏng request chính nếu ghi lỗi. */
export async function logActivity(type, { task, project, from = null, to = null } = {}) {
  try {
    await Activity.create({
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

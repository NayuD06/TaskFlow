import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { logActivity } from './activity.js';

/** Tạo sẵn một dự án hướng dẫn cho người mới đăng ký, để lần đầu vào không bị trống trơn. */
export async function createStarterProject(owner) {
  const project = await Project.create({
    owner,
    name: 'Bắt đầu với TaskFlow',
    description: 'Dự án mẫu giúp bạn làm quen. Xoá đi khi đã quen tay nhé.',
    color: 'blue',
  });
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const tasks = await Task.insertMany([
    {
      owner,
      project: project._id,
      title: 'Kéo thẻ này sang cột “Đang làm”',
      description: 'Trên bảng Kanban, nhấn giữ một thẻ rồi kéo sang cột khác. Thứ tự được lưu lại.',
      status: 'todo',
      priority: 'high',
      deadline: new Date(now + day),
      order: 0,
    },
    {
      owner,
      project: project._id,
      title: 'Mở thẻ để xem chi tiết và checklist',
      description: 'Bấm vào một thẻ để sửa tên, mô tả, hạn chót, độ ưu tiên và thêm việc con.',
      status: 'todo',
      priority: 'medium',
      order: 1,
      checklist: [
        { text: 'Đặt hạn chót', done: false },
        { text: 'Chọn độ ưu tiên', done: false },
        { text: 'Thêm một việc con', done: false },
      ],
    },
    {
      owner,
      project: project._id,
      title: 'Nhấn Ctrl K để tìm nhanh',
      description: 'Tìm việc, dự án hoặc chuyển trang mà không cần chuột. Phím N để thêm việc mới.',
      status: 'doing',
      priority: 'low',
      order: 0,
    },
  ]);
  await logActivity('project_created', { project, owner });
  for (const task of tasks) await logActivity('task_created', { task, project, owner });
  return project;
}

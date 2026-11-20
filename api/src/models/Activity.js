import mongoose from 'mongoose';

export const ACTIVITY_TYPES = [
  'task_created',
  'task_completed',
  'task_reopened',
  'task_moved',
  'task_deleted',
  'project_created',
];

// Nhật ký hoạt động. Lưu kèm tên task/dự án tại thời điểm đó để vẫn đọc được khi đã bị xoá.
const activitySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
    taskTitle: { type: String, default: '' },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
    projectName: { type: String, default: '' },
    projectColor: { type: String, default: 'blue' },
    from: { type: String, default: null },
    to: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

activitySchema.index({ createdAt: -1 });

export const Activity = mongoose.model('Activity', activitySchema);

import mongoose from 'mongoose';

export const STATUSES = ['todo', 'doing', 'done'];
export const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
export const MAX_TAGS = 8;
export const MAX_TAG_LENGTH = 24;
export const REPEATS = ['none', 'daily', 'weekdays', 'weekly', 'monthly'];
export const MAX_ATTACHMENTS = 10;

const checklistItemSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, 'Nội dung mục checklist là bắt buộc'],
      trim: true,
      maxlength: [200, 'Mục checklist tối đa 200 ký tự'],
    },
    done: { type: Boolean, default: false },
  },
  { _id: true }
);

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, maxlength: 500 },
    publicId: { type: String, default: '', maxlength: 300 },
    name: { type: String, default: '', trim: true, maxlength: 120 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    bytes: { type: Number, default: 0 },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: true, timestamps: { createdAt: true, updatedAt: false } }
);

const taskSchema = new mongoose.Schema(
  {
    // Chủ dự án (người sở hữu dữ liệu). Thành viên được mời vẫn sửa được, quyền kiểm tra theo dự án.
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Công việc phải thuộc một dự án'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Tên công việc là bắt buộc'],
      trim: true,
      maxlength: [120, 'Tên công việc tối đa 120 ký tự'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2000, 'Mô tả tối đa 2000 ký tự'],
    },
    status: {
      type: String,
      enum: { values: STATUSES, message: 'Trạng thái không hợp lệ' },
      default: 'todo',
    },
    priority: {
      type: String,
      enum: { values: PRIORITIES, message: 'Độ ưu tiên không hợp lệ' },
      default: 'medium',
    },
    deadline: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    // Vị trí trong cột Kanban (nhỏ đứng trước)
    order: { type: Number, default: 0 },
    checklist: {
      type: [checklistItemSchema],
      default: [],
      validate: [(v) => v.length <= 50, 'Checklist tối đa 50 mục'],
    },
    // Nhãn tự do do người dùng đặt (đã chuẩn hoá ở taskQuery.normalizeTags)
    tags: {
      type: [{ type: String, trim: true, maxlength: [MAX_TAG_LENGTH, `Mỗi nhãn tối đa ${MAX_TAG_LENGTH} ký tự`] }],
      default: [],
      validate: [(v) => v.length <= MAX_TAGS, `Tối đa ${MAX_TAGS} nhãn cho một công việc`],
    },
    // Việc lặp lại: khi hoàn thành sẽ tự tạo lần tiếp theo (repeatSpawned để không tạo trùng)
    repeat: {
      type: String,
      enum: { values: REPEATS, message: 'Kiểu lặp lại không hợp lệ' },
      default: 'none',
    },
    repeatSpawned: { type: Boolean, default: false },
    attachments: {
      type: [attachmentSchema],
      default: [],
      validate: [(v) => v.length <= MAX_ATTACHMENTS, `Tối đa ${MAX_ATTACHMENTS} ảnh cho một công việc`],
    },
    // Pomodoro: số phiên tập trung đã xong và tổng số phút
    pomodoros: { type: Number, default: 0, min: 0 },
    focusMinutes: { type: Number, default: 0, min: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false }
);

// Giữ completedAt luôn khớp với status
taskSchema.pre('save', function syncCompletedAt() {
  if (this.isModified('status')) {
    if (this.status === 'done' && !this.completedAt) this.completedAt = new Date();
    if (this.status !== 'done') this.completedAt = null;
  }
});

taskSchema.index({ project: 1, status: 1, order: 1 });
taskSchema.index({ owner: 1, status: 1, deadline: 1 });
taskSchema.index({ owner: 1, tags: 1 });

export const Task = mongoose.model('Task', taskSchema);

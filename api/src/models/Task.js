import mongoose from 'mongoose';

export const STATUSES = ['todo', 'doing', 'done'];
export const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
export const MAX_TAGS = 8;
export const MAX_TAG_LENGTH = 24;

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

const taskSchema = new mongoose.Schema(
  {
    // Lưu chủ sở hữu ngay trên task để lọc nhanh, không cần tra dự án
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

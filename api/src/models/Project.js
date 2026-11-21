import mongoose from 'mongoose';

// Mỗi dự án có một "hue" trong bảng màu cố định; frontend map tên -> mã màu
export const PROJECT_COLORS = [
  'blue',
  'sky',
  'cyan',
  'teal',
  'green',
  'amber',
  'orange',
  'rose',
  'violet',
  'indigo',
];

const projectSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Tên dự án là bắt buộc'],
      trim: true,
      maxlength: [60, 'Tên dự án tối đa 60 ký tự'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [300, 'Mô tả tối đa 300 ký tự'],
    },
    color: {
      type: String,
      enum: { values: PROJECT_COLORS, message: 'Màu không hợp lệ' },
      default: 'blue',
    },
    archived: {
      type: Boolean,
      default: false,
    },
    // Người được chủ dự án mời vào cùng làm: xem và sửa công việc, bình luận
    members: {
      type: [
        {
          _id: false,
          user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
          addedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    // Lời mời gửi tới email chưa có tài khoản: tự vào dự án khi người đó đăng ký
    invites: {
      type: [
        {
          _id: false,
          email: { type: String, required: true, lowercase: true, trim: true },
          invitedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true, versionKey: false }
);

export const MAX_MEMBERS = 20;

projectSchema.index({ owner: 1, archived: 1, updatedAt: -1 });
projectSchema.index({ 'members.user': 1 });
projectSchema.index({ 'invites.email': 1 });

export const Project = mongoose.model('Project', projectSchema);

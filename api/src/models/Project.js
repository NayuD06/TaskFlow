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
  },
  { timestamps: true, versionKey: false }
);

export const Project = mongoose.model('Project', projectSchema);

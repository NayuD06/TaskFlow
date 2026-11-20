import mongoose from 'mongoose';
import { PROJECT_COLORS } from './Project.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tên là bắt buộc'],
      trim: true,
      minlength: [2, 'Tên tối thiểu 2 ký tự'],
      maxlength: [50, 'Tên tối đa 50 ký tự'],
    },
    email: {
      type: String,
      required: [true, 'Email là bắt buộc'],
      trim: true,
      lowercase: true,
      maxlength: [254, 'Email quá dài'],
      unique: true,
    },
    // Chỉ lưu mật khẩu đã băm bằng bcrypt, không bao giờ trả về cho client
    passwordHash: { type: String, required: true, select: false },
    avatarColor: {
      type: String,
      enum: { values: PROJECT_COLORS, message: 'Màu không hợp lệ' },
      default: 'blue',
    },
    // Tăng lên khi đổi mật khẩu hoặc "đăng xuất mọi thiết bị" để vô hiệu các token cũ
    tokenVersion: { type: Number, default: 0, select: false },
    lastLoginAt: { type: Date, default: null },
    // Tài khoản demo công khai: không cho đổi mật khẩu, sửa hồ sơ hay xoá để người sau vẫn vào được
    isDemo: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        delete ret.passwordHash;
        delete ret.tokenVersion;
        return ret;
      },
    },
  }
);

export const User = mongoose.model('User', userSchema);

/** Dữ liệu người dùng an toàn để gửi cho client. */
export function publicUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    avatarColor: user.avatarColor,
    isDemo: !!user.isDemo,
    createdAt: user.createdAt,
  };
}

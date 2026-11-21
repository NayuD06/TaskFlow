import mongoose from 'mongoose';
import { PROJECT_COLORS } from './Project.js';

export const AVATAR_MAX_LENGTH = 60_000;
export const AVATAR_EMOJIS = ['🐳', '🐬', '🐙', '🦈', '🐢', '🦦', '🐧', '🦀', '🐠', '🪼', '🐋', '🦭'];

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
    // Chỉ lưu mật khẩu đã băm bằng bcrypt, không bao giờ trả về cho client.
    // Người đăng ký bằng Google chưa có mật khẩu (null) cho tới khi tự đặt.
    passwordHash: { type: String, default: null, select: false },
    passwordSet: { type: Boolean, default: true },
    googleId: { type: String, default: undefined, unique: true, sparse: true, select: false },
    // Đặt lại mật khẩu qua email: chỉ lưu mã băm SHA-256 của token, hết hạn sau 30 phút
    resetTokenHash: { type: String, default: null, select: false },
    resetTokenExpires: { type: Date, default: null, select: false },
    avatarColor: {
      type: String,
      enum: { values: PROJECT_COLORS, message: 'Màu không hợp lệ' },
      default: 'blue',
    },
    // Ảnh đại diện: "" (chữ cái đầu), "emoji:🐳" (chọn sẵn) hoặc ảnh nhỏ dạng data URL (đã thu nhỏ ở trình duyệt)
    avatar: { type: String, default: '', maxlength: [AVATAR_MAX_LENGTH, 'Ảnh đại diện quá lớn'] },
    // Màu nhấn của giao diện, đồng bộ giữa các thiết bị
    accentColor: {
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
        delete ret.googleId;
        delete ret.resetTokenHash;
        delete ret.resetTokenExpires;
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
    avatar: user.avatar || '',
    accentColor: user.accentColor || 'blue',
    isDemo: !!user.isDemo,
    hasPassword: user.passwordSet !== false,
    createdAt: user.createdAt,
  };
}

/** Thông tin rút gọn để hiện người khác trong dự án chung (không có email). */
export function memberCard(user) {
  if (!user) return null;
  return { _id: user._id, name: user.name, avatar: user.avatar || '', avatarColor: user.avatarColor || 'blue' };
}

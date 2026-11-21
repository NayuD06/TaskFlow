import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { verifyToken } from '../lib/auth.js';
import { User, isAdmin } from '../models/User.js';

/** Lỗi 403 khi tài khoản đã bị quản trị viên khoá. */
export function accountLocked() {
  const err = new Error('Tài khoản đã bị khoá. Hãy liên hệ quản trị viên.');
  err.status = 403;
  err.code = 'account_locked';
  return err;
}

function unauthorized(message = 'Bạn cần đăng nhập để tiếp tục') {
  const err = new Error(message);
  err.status = 401;
  return err;
}

/**
 * Bắt buộc đăng nhập. Đọc header "Authorization: Bearer <token>",
 * kiểm tra chữ ký, hạn dùng và tokenVersion, rồi gắn req.user.
 */
export async function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw unauthorized();

  const { userId, version } = verifyToken(token, env.jwtSecret);
  if (!mongoose.isValidObjectId(userId)) throw unauthorized('Phiên đăng nhập không hợp lệ');

  const user = await User.findById(userId).select('+tokenVersion').lean();
  // Tài khoản đã xoá, hoặc token cũ sau khi đổi mật khẩu / đăng xuất mọi thiết bị
  if (!user || (user.tokenVersion ?? 0) !== version) throw unauthorized('Phiên đăng nhập đã hết hạn, hãy đăng nhập lại');

  if (user.disabled) throw accountLocked();

  req.user = user;
  next();
}

/** Chỉ quản trị viên. Dùng sau requireAuth. */
export function requireAdmin(req, res, next) {
  if (!isAdmin(req.user)) {
    const err = new Error('Bạn không có quyền vào trang quản trị');
    err.status = 403;
    throw err;
  }
  next();
}

import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { verifyToken } from '../lib/auth.js';
import { User } from '../models/User.js';

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

  req.user = user;
  next();
}

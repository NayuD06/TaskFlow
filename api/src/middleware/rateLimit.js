import { rateLimit } from 'express-rate-limit';

const tooMany = (message) => (req, res) => res.status(429).json({ error: { message } });

// Đăng nhập / đăng ký: chặn dò mật khẩu. Lần đăng nhập thành công không bị tính.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: tooMany('Bạn thử quá nhiều lần. Hãy đợi khoảng 15 phút rồi thử lại.'),
});

// Các thao tác nhạy cảm khác (đổi mật khẩu, xoá tài khoản)
export const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: tooMany('Bạn thao tác quá nhiều lần. Hãy đợi một lúc rồi thử lại.'),
});

// Giới hạn chung cho toàn bộ API để tránh bị spam
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: tooMany('Quá nhiều yêu cầu, hãy thử lại sau ít phút.'),
});

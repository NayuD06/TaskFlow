import { rateLimit } from 'express-rate-limit';

const tooMany = (message) => (req, res) => res.status(429).json({ error: { message } });
// Test tự động gọi API liên tục nên tắt giới hạn khi NODE_ENV=test
const skip = () => process.env.NODE_ENV === 'test';

// Đăng nhập / đăng ký: chặn dò mật khẩu. Lần đăng nhập thành công không bị tính.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip,
  handler: tooMany('Bạn thử quá nhiều lần. Hãy đợi khoảng 15 phút rồi thử lại.'),
});

// Các thao tác nhạy cảm khác (đổi mật khẩu, xoá tài khoản)
export const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip,
  handler: tooMany('Bạn thao tác quá nhiều lần. Hãy đợi một lúc rồi thử lại.'),
});

// Gửi email (quên mật khẩu): ít hơn nữa để không bị lợi dụng spam hộp thư người khác
export const mailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip,
  handler: tooMany('Bạn đã yêu cầu quá nhiều lần. Hãy kiểm tra hộp thư hoặc đợi 15 phút.'),
});

// Xin chữ ký tải ảnh: mỗi tài khoản tối đa 60 ảnh mỗi 15 phút, đủ dùng mà không bị lạm dụng dung lượng Cloudinary
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => `user:${req.user._id}`, // chạy sau requireAuth nên luôn có req.user
  skip,
  handler: tooMany('Bạn tải ảnh quá nhiều trong thời gian ngắn. Hãy đợi khoảng 15 phút.'),
});

// Giới hạn chung cho toàn bộ API để tránh bị spam
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip,
  handler: tooMany('Quá nhiều yêu cầu, hãy thử lại sau ít phút.'),
});

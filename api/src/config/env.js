import 'dotenv/config';
import { parseCloudinaryUrl } from '../lib/cloudinaryUrl.js';

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

function fail(message) {
  console.error(`[config] ${message}`);
  process.exit(1);
}

if (!process.env.MONGODB_URI) {
  fail('Thiếu biến môi trường: MONGODB_URI. Hãy copy api/.env.example thành api/.env và điền giá trị.');
}

// Khoá ký JWT. Production bắt buộc phải có và đủ dài, local thì cho dùng tạm khoá mặc định.
const DEV_SECRET = 'taskflow-dev-only-secret-do-not-use-in-production';
let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  if (isProduction) fail('Thiếu biến môi trường: JWT_SECRET (chuỗi ngẫu nhiên dài ít nhất 32 ký tự).');
  console.warn('[config] Chưa đặt JWT_SECRET, đang dùng khoá mặc định chỉ dành cho máy local.');
  jwtSecret = DEV_SECRET;
} else if (isProduction && (jwtSecret.length < 32 || jwtSecret === DEV_SECRET)) {
  fail('JWT_SECRET quá ngắn hoặc là khoá mặc định. Hãy dùng chuỗi ngẫu nhiên dài ít nhất 32 ký tự.');
}

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

const clean = (value) => (typeof value === 'string' ? value.trim() : '');

// Cloudinary: chỉ cần một biến CLOUDINARY_URL. Các biến lẻ (nếu có) được ưu tiên hơn.
const cloudinaryUrl = parseCloudinaryUrl(process.env.CLOUDINARY_URL);
if (cloudinaryUrl.invalid) {
  console.warn('[config] CLOUDINARY_URL sai dạng, cần giống: cloudinary://API_KEY:API_SECRET@CLOUD_NAME. Tạm tắt tính năng ảnh.');
}

export const env = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI,
  nodeEnv,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigins,
  // Địa chỉ web, dùng để tạo link trong email (đặt lại mật khẩu, lời mời vào dự án)
  appUrl: (clean(process.env.APP_URL) || corsOrigins.find((o) => !o.includes('*')) || 'http://localhost:5173').replace(/\/$/, ''),
  // Gửi email qua API HTTP (Render bản miễn phí chặn cổng SMTP): Brevo hoặc Resend
  mail: {
    from: clean(process.env.MAIL_FROM),
    brevoKey: clean(process.env.BREVO_API_KEY),
    resendKey: clean(process.env.RESEND_API_KEY),
  },
  googleClientId: clean(process.env.GOOGLE_CLIENT_ID),
  // Ảnh tải thẳng từ trình duyệt lên Cloudinary. Máy chủ ký từng lần tải bằng API secret,
  // nên không cần tạo "upload preset". Khoá cũng dùng cho trang quản trị xem và xoá ảnh.
  cloudinary: {
    cloudName: clean(process.env.CLOUDINARY_CLOUD_NAME) || cloudinaryUrl.cloudName || '',
    apiKey: clean(process.env.CLOUDINARY_API_KEY) || cloudinaryUrl.apiKey || '',
    apiSecret: clean(process.env.CLOUDINARY_API_SECRET) || cloudinaryUrl.apiSecret || '',
    // Cách cũ (không bắt buộc): upload preset không ký, chỉ dùng khi không có API secret
    uploadPreset: clean(process.env.CLOUDINARY_UPLOAD_PRESET),
  },
  // Email luôn là quản trị viên (cách nhanh nhất để có tài khoản admin đầu tiên), cách nhau bằng dấu phẩy
  adminEmails: (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
  sentryDsn: clean(process.env.SENTRY_DSN),
};

export const isProd = isProduction;
export const isTest = nodeEnv === 'test';

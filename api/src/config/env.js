import 'dotenv/config';

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

export const env = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI,
  nodeEnv,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean),
};

export const isProd = isProduction;

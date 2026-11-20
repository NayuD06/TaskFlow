import 'dotenv/config';

const required = ['MONGODB_URI'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(
    `[config] Thiếu biến môi trường: ${missing.join(', ')}. ` +
      'Hãy copy api/.env.example thành api/.env và điền giá trị.'
  );
  process.exit(1);
}

export const env = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean),
};

export const isProd = env.nodeEnv === 'production';

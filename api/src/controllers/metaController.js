import { env } from '../config/env.js';
import { mailProvider } from '../services/mailer.js';

// GET /api/config  cấu hình công khai cho web: chỉ cần đặt biến môi trường trên server
export function publicConfig(req, res) {
  const { cloudName, uploadPreset } = env.cloudinary;
  res.set('Cache-Control', 'public, max-age=300');
  res.json({
    data: {
      googleClientId: env.googleClientId || null,
      uploads: cloudName && uploadPreset ? { provider: 'cloudinary', cloudName, uploadPreset } : null,
      mail: Boolean(mailProvider()),
    },
  });
}

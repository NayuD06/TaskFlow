import { env } from '../config/env.js';
import { invalid } from '../lib/validate.js';
import { mailProvider } from '../services/mailer.js';
import { UPLOAD_KINDS, signedUpload, uploadMode } from '../services/cloudinary.js';

function unavailable(message) {
  const err = new Error(message);
  err.status = 503;
  return err;
}

function uploadsConfig() {
  const mode = uploadMode();
  if (mode === 'signed') return { provider: 'cloudinary', cloudName: env.cloudinary.cloudName, signed: true };
  if (mode === 'unsigned') return { provider: 'cloudinary', cloudName: env.cloudinary.cloudName, uploadPreset: env.cloudinary.uploadPreset };
  return null;
}

// GET /api/config  cấu hình công khai cho web: chỉ cần đặt biến môi trường trên server
export function publicConfig(req, res) {
  res.set('Cache-Control', 'public, max-age=300');
  res.json({
    data: {
      googleClientId: env.googleClientId || null,
      uploads: uploadsConfig(),
      mail: Boolean(mailProvider()),
    },
  });
}

// POST /api/uploads/sign  { kind: 'tasks' | 'avatars' }  chữ ký để trình duyệt tải một ảnh thẳng lên Cloudinary
export function signUpload(req, res) {
  if (uploadMode() !== 'signed') throw unavailable('Máy chủ chưa bật tải ảnh (thiếu CLOUDINARY_URL)');
  const kind = req.body?.kind ?? 'tasks';
  if (!UPLOAD_KINDS.includes(kind)) throw invalid({ kind: 'Loại ảnh không hợp lệ' });
  res.set('Cache-Control', 'no-store');
  res.json({ data: signedUpload(kind) });
}

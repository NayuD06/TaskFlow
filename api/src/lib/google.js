// Xác minh "ID token" mà nút Đăng nhập bằng Google trả về cho trình duyệt.
import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';

let client = null;
let override = null;

/** Chỉ dùng trong test: thay hàm xác minh bằng hàm giả. */
export function setGoogleVerifier(fn) {
  override = fn;
}

/** Trả về { sub, email, emailVerified, name } hoặc ném lỗi 401. */
export async function verifyGoogleCredential(credential) {
  if (override) return override(credential);
  if (!env.googleClientId) {
    const err = new Error('Máy chủ chưa bật đăng nhập bằng Google');
    err.status = 503;
    throw err;
  }
  client ??= new OAuth2Client(env.googleClientId);
  try {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: env.googleClientId });
    const p = ticket.getPayload();
    return { sub: p.sub, email: p.email, emailVerified: !!p.email_verified, name: p.name || p.given_name || '' };
  } catch {
    const err = new Error('Không xác minh được tài khoản Google, hãy thử lại');
    err.status = 401;
    throw err;
  }
}

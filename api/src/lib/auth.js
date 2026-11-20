// Băm mật khẩu và ký/kiểm tra JWT. Tách riêng (không đụng DB) để dễ test.
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 12;
const ISSUER = 'taskflow-api';

// Hash giả để so sánh khi email không tồn tại, giúp thời gian phản hồi giống nhau
// (kẻ xấu không đoán được email nào đã đăng ký dựa vào tốc độ trả lời).
const DUMMY_HASH = bcrypt.hashSync('taskflow-dummy-password', SALT_ROUNDS);

export const hashPassword = (password) => bcrypt.hash(password, SALT_ROUNDS);

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash || DUMMY_HASH).then((ok) => ok && !!hash);
}

export function signToken(user, { secret, expiresIn }) {
  return jwt.sign({ v: user.tokenVersion ?? 0 }, secret, {
    subject: String(user._id),
    issuer: ISSUER,
    expiresIn,
    algorithm: 'HS256',
  });
}

/** Trả về { userId, version } hoặc ném lỗi 401. */
export function verifyToken(token, secret) {
  try {
    const payload = jwt.verify(token, secret, { issuer: ISSUER, algorithms: ['HS256'] });
    return { userId: payload.sub, version: payload.v ?? 0 };
  } catch (err) {
    const error = new Error(err.name === 'TokenExpiredError' ? 'Phiên đăng nhập đã hết hạn, hãy đăng nhập lại' : 'Phiên đăng nhập không hợp lệ');
    error.status = 401;
    throw error;
  }
}

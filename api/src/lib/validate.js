// Kiểm tra dữ liệu đầu vào cho tài khoản. Ném lỗi 400 kèm lỗi từng trường để form hiển thị.
import { PROJECT_COLORS } from '../models/Project.js';
import { AVATAR_EMOJIS, AVATAR_MAX_LENGTH } from '../models/User.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function invalid(fields) {
  const err = new Error(Object.values(fields)[0] || 'Dữ liệu không hợp lệ');
  err.status = 400;
  err.fields = fields;
  return err;
}

const str = (value) => (typeof value === 'string' ? value : '');

export function normalizeEmail(value) {
  return str(value).trim().toLowerCase();
}

function checkName(name, fields) {
  if (name.length < 2) fields.name = 'Tên tối thiểu 2 ký tự';
  else if (name.length > 50) fields.name = 'Tên tối đa 50 ký tự';
}

function checkEmail(email, fields) {
  if (!email) fields.email = 'Hãy nhập email';
  else if (email.length > 254 || !EMAIL_RE.test(email)) fields.email = 'Email không hợp lệ';
}

/** Mật khẩu 8 đến 72 byte (giới hạn của bcrypt), có cả chữ và số. */
export function passwordProblem(password) {
  if (password.length < 8) return 'Mật khẩu tối thiểu 8 ký tự';
  if (Buffer.byteLength(password, 'utf8') > 72) return 'Mật khẩu quá dài (tối đa 72 ký tự)';
  if (!/\p{L}/u.test(password) || !/\d/.test(password)) return 'Mật khẩu cần có cả chữ và số';
  return null;
}

export function validateRegister(body = {}) {
  const data = { name: str(body.name).trim().replace(/\s+/g, ' '), email: normalizeEmail(body.email), password: str(body.password) };
  const fields = {};
  checkName(data.name, fields);
  checkEmail(data.email, fields);
  const problem = passwordProblem(data.password);
  if (problem) fields.password = problem;
  if (Object.keys(fields).length) throw invalid(fields);
  return data;
}

export function validateLogin(body = {}) {
  const data = { email: normalizeEmail(body.email), password: str(body.password) };
  const fields = {};
  if (!data.email) fields.email = 'Hãy nhập email';
  if (!data.password) fields.password = 'Hãy nhập mật khẩu';
  else if (data.password.length > 200) fields.password = 'Mật khẩu không đúng';
  if (Object.keys(fields).length) throw invalid(fields);
  return data;
}

// Chỉ nhận ảnh raster nhỏ (không nhận SVG vì có thể chứa mã), hoặc emoji trong danh sách có sẵn
const DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

function avatarProblem(value) {
  if (typeof value !== 'string') return 'Ảnh đại diện không hợp lệ';
  if (value === '') return null;
  if (value.startsWith('emoji:')) return AVATAR_EMOJIS.includes(value.slice(6)) ? null : 'Ảnh đại diện không hợp lệ';
  if (value.length > AVATAR_MAX_LENGTH) return 'Ảnh quá lớn, hãy chọn ảnh khác';
  return DATA_URL.test(value) ? null : 'Ảnh đại diện không hợp lệ';
}

export function validateProfile(body = {}) {
  const data = {};
  const fields = {};
  if (body.name !== undefined) {
    data.name = str(body.name).trim().replace(/\s+/g, ' ');
    checkName(data.name, fields);
  }
  if (body.avatarColor !== undefined) {
    if (!PROJECT_COLORS.includes(body.avatarColor)) fields.avatarColor = 'Màu không hợp lệ';
    else data.avatarColor = body.avatarColor;
  }
  if (body.accentColor !== undefined) {
    if (!PROJECT_COLORS.includes(body.accentColor)) fields.accentColor = 'Màu không hợp lệ';
    else data.accentColor = body.accentColor;
  }
  if (body.avatar !== undefined) {
    const problem = avatarProblem(body.avatar);
    if (problem) fields.avatar = problem;
    else data.avatar = body.avatar;
  }
  if (Object.keys(fields).length) throw invalid(fields);
  return data;
}

export function validatePasswordChange(body = {}) {
  const data = { currentPassword: str(body.currentPassword), newPassword: str(body.newPassword) };
  const fields = {};
  if (!data.currentPassword) fields.currentPassword = 'Hãy nhập mật khẩu hiện tại';
  const problem = passwordProblem(data.newPassword);
  if (problem) fields.newPassword = problem;
  else if (data.newPassword === data.currentPassword) fields.newPassword = 'Mật khẩu mới phải khác mật khẩu cũ';
  if (Object.keys(fields).length) throw invalid(fields);
  return data;
}

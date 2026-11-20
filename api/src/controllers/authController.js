import { env } from '../config/env.js';
import { hashPassword, signToken, verifyPassword } from '../lib/auth.js';
import { invalid, validateLogin, validatePasswordChange, validateProfile, validateRegister } from '../lib/validate.js';
import { Activity } from '../models/Activity.js';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { User, publicUser } from '../models/User.js';
import { createStarterProject } from '../services/onboarding.js';

const tokenFor = (user) => signToken(user, { secret: env.jwtSecret, expiresIn: env.jwtExpiresIn });
const COLORS = ['blue', 'sky', 'cyan', 'teal', 'green', 'amber', 'orange', 'rose', 'violet', 'indigo'];

function blockDemo(user) {
  if (!user.isDemo) return;
  const err = new Error('Tài khoản demo dùng chung nên không thể đổi thông tin này. Hãy tự đăng ký một tài khoản nhé.');
  err.status = 403;
  throw err;
}

function badCredentials() {
  const err = new Error('Email hoặc mật khẩu không đúng');
  err.status = 401;
  return err;
}

// POST /api/auth/register  { name, email, password }
export async function register(req, res) {
  const { name, email, password } = validateRegister(req.body);
  if (await User.exists({ email })) throw Object.assign(invalid({ email: 'Email này đã được đăng ký' }), { status: 409 });

  const user = await User.create({
    name,
    email,
    passwordHash: await hashPassword(password),
    avatarColor: COLORS[Math.floor(Math.random() * COLORS.length)],
    lastLoginAt: new Date(),
  });
  await createStarterProject(user._id).catch((err) => console.warn('[auth] Không tạo được dự án mẫu:', err.message));

  res.status(201).json({ data: { user: publicUser(user), token: tokenFor(user) } });
}

// POST /api/auth/login  { email, password }
export async function login(req, res) {
  const { email, password } = validateLogin(req.body);
  const user = await User.findOne({ email }).select('+passwordHash +tokenVersion');
  // Luôn chạy bcrypt kể cả khi không có user để thời gian phản hồi như nhau
  const ok = await verifyPassword(password, user?.passwordHash);
  if (!user || !ok) throw badCredentials();

  user.lastLoginAt = new Date();
  await user.save();
  res.json({ data: { user: publicUser(user), token: tokenFor(user) } });
}

// GET /api/auth/me
export async function me(req, res) {
  res.json({ data: publicUser(req.user) });
}

// PATCH /api/auth/me  { name?, avatarColor? }
export async function updateMe(req, res) {
  blockDemo(req.user);
  const data = validateProfile(req.body);
  const user = await User.findByIdAndUpdate(req.user._id, data, { new: true, runValidators: true });
  res.json({ data: publicUser(user) });
}

async function loadWithSecrets(id) {
  return User.findById(id).select('+passwordHash +tokenVersion');
}

// POST /api/auth/change-password  { currentPassword, newPassword }
export async function changePassword(req, res) {
  blockDemo(req.user);
  const { currentPassword, newPassword } = validatePasswordChange(req.body);
  const user = await loadWithSecrets(req.user._id);
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw invalid({ currentPassword: 'Mật khẩu hiện tại không đúng' });
  }
  user.passwordHash = await hashPassword(newPassword);
  user.tokenVersion = (user.tokenVersion ?? 0) + 1; // các thiết bị khác bị đăng xuất
  await user.save();
  res.json({ data: { user: publicUser(user), token: tokenFor(user) } });
}

// POST /api/auth/logout-all  (vô hiệu mọi token, kể cả token hiện tại)
export async function logoutAll(req, res) {
  blockDemo(req.user);
  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
  res.json({ data: { ok: true } });
}

// DELETE /api/auth/me  { password }  (xoá tài khoản và toàn bộ dữ liệu)
export async function deleteMe(req, res) {
  blockDemo(req.user);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const user = await loadWithSecrets(req.user._id);
  if (!password || !(await verifyPassword(password, user.passwordHash))) {
    throw invalid({ password: 'Mật khẩu không đúng' });
  }
  const owner = user._id;
  const [tasks, projects] = await Promise.all([Task.deleteMany({ owner }), Project.deleteMany({ owner }), Activity.deleteMany({ owner })]);
  await user.deleteOne();
  res.json({ data: { deletedProjects: projects.deletedCount, deletedTasks: tasks.deletedCount } });
}

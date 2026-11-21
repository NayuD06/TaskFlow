import { createHash, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';
import { hashPassword, signToken, verifyPassword } from '../lib/auth.js';
import { verifyGoogleCredential } from '../lib/google.js';
import {
  invalid,
  validateForgot,
  validateLogin,
  validatePasswordChange,
  validateProfile,
  validateRegister,
  validateReset,
} from '../lib/validate.js';
import { Activity } from '../models/Activity.js';
import { Comment } from '../models/Comment.js';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { User, publicUser } from '../models/User.js';
import { claimInvites } from '../services/access.js';
import { resetPasswordEmail } from '../services/emails.js';
import { sendMail } from '../services/mailer.js';
import { createStarterProject } from '../services/onboarding.js';

const tokenFor = (user) => signToken(user, { secret: env.jwtSecret, expiresIn: env.jwtExpiresIn });
const COLORS = ['blue', 'sky', 'cyan', 'teal', 'green', 'amber', 'orange', 'rose', 'violet', 'indigo'];
const RESET_TTL = 30 * 60 * 1000;
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

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

/** Việc chung khi có tài khoản mới (đăng ký thường hoặc bằng Google). */
async function welcome(user) {
  await createStarterProject(user._id).catch((err) => console.warn('[auth] Không tạo được dự án mẫu:', err.message));
  await claimInvites(user).catch((err) => console.warn('[auth] Không nhận được lời mời:', err.message));
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
  await welcome(user);
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

// POST /api/auth/google  { credential }  đăng nhập hoặc đăng ký bằng tài khoản Google
export async function googleSignIn(req, res) {
  const credential = typeof req.body?.credential === 'string' ? req.body.credential : '';
  if (!credential || credential.length > 4096) throw invalid({ credential: 'Thiếu thông tin đăng nhập Google' });
  const profile = await verifyGoogleCredential(credential);
  const email = String(profile.email || '').toLowerCase();
  if (!email || !profile.emailVerified) {
    const err = new Error('Email Google này chưa được xác minh');
    err.status = 401;
    throw err;
  }

  let user = await User.findOne({ googleId: profile.sub }).select('+tokenVersion +googleId');
  let created = false;
  if (!user) {
    user = await User.findOne({ email }).select('+tokenVersion +googleId');
    if (user?.isDemo) {
      const err = new Error('Không thể liên kết Google với tài khoản demo');
      err.status = 403;
      throw err;
    }
    if (user) {
      // Email đã có tài khoản: liên kết với Google (Google đã xác minh email thuộc về người này)
      user.googleId = profile.sub;
    } else {
      const name = (profile.name || email.split('@')[0]).trim().replace(/\s+/g, ' ').slice(0, 50).padEnd(2, '.');
      user = new User({ name, email, googleId: profile.sub, passwordHash: null, passwordSet: false, avatarColor: COLORS[Math.floor(Math.random() * COLORS.length)] });
      created = true;
    }
  }
  user.lastLoginAt = new Date();
  await user.save();
  if (created) await welcome(user);
  res.status(created ? 201 : 200).json({ data: { user: publicUser(user), token: tokenFor(user), created } });
}

// POST /api/auth/forgot-password  { email }
// Luôn trả lời giống nhau để không ai dò được email nào đã đăng ký.
export async function forgotPassword(req, res) {
  const { email } = validateForgot(req.body);
  const user = await User.findOne({ email });
  if (user && !user.isDemo) {
    const token = randomBytes(32).toString('base64url');
    user.resetTokenHash = sha256(token);
    user.resetTokenExpires = new Date(Date.now() + RESET_TTL);
    await user.save();
    const link = `${env.appUrl}/reset-password?token=${token}`;
    await sendMail({ to: user.email, ...resetPasswordEmail({ name: user.name, link }) });
  }
  res.json({ data: { ok: true } });
}

// POST /api/auth/reset-password  { token, password }  -> đăng nhập luôn bằng mật khẩu mới
export async function resetPassword(req, res) {
  const { token, password } = validateReset(req.body);
  const user = await User.findOne({ resetTokenHash: sha256(token), resetTokenExpires: { $gt: new Date() } }).select('+tokenVersion');
  if (!user) throw invalid({ token: 'Liên kết đã hết hạn hoặc đã được dùng. Hãy yêu cầu liên kết mới.' });
  user.passwordHash = await hashPassword(password);
  user.passwordSet = true;
  user.resetTokenHash = null;
  user.resetTokenExpires = null;
  user.tokenVersion = (user.tokenVersion ?? 0) + 1; // đăng xuất các thiết bị cũ
  user.lastLoginAt = new Date();
  await user.save();
  res.json({ data: { user: publicUser(user), token: tokenFor(user) } });
}

// GET /api/auth/me
export async function me(req, res) {
  res.json({ data: publicUser(req.user) });
}

// PATCH /api/auth/me  { name?, avatarColor?, avatar?, accentColor? }
export async function updateMe(req, res) {
  blockDemo(req.user);
  const data = validateProfile(req.body, { cloudName: env.cloudinary.cloudName });
  const user = await User.findByIdAndUpdate(req.user._id, data, { new: true, runValidators: true });
  res.json({ data: publicUser(user) });
}

async function loadWithSecrets(id) {
  return User.findById(id).select('+passwordHash +tokenVersion');
}

// POST /api/auth/change-password  { currentPassword, newPassword }
// Tài khoản tạo bằng Google chưa có mật khẩu thì đặt lần đầu, không cần mật khẩu hiện tại.
export async function changePassword(req, res) {
  blockDemo(req.user);
  const user = await loadWithSecrets(req.user._id);
  const firstTime = user.passwordSet === false;
  const { currentPassword, newPassword } = validatePasswordChange(req.body, { requireCurrent: !firstTime });
  if (!firstTime && !(await verifyPassword(currentPassword, user.passwordHash))) {
    throw invalid({ currentPassword: 'Mật khẩu hiện tại không đúng' });
  }
  user.passwordHash = await hashPassword(newPassword);
  user.passwordSet = true;
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

// DELETE /api/auth/me  { password } hoặc { confirm: email } với tài khoản chưa có mật khẩu
export async function deleteMe(req, res) {
  blockDemo(req.user);
  const user = await loadWithSecrets(req.user._id);
  if (user.passwordSet === false) {
    const confirm = String(req.body?.confirm || '').trim().toLowerCase();
    if (confirm !== user.email) throw invalid({ confirm: 'Hãy gõ đúng email của bạn để xác nhận' });
  } else {
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!password || !(await verifyPassword(password, user.passwordHash))) throw invalid({ password: 'Mật khẩu không đúng' });
  }
  const owner = user._id;
  const ownedIds = await Project.find({ owner }).distinct('_id');
  const [tasks, projects] = await Promise.all([
    Task.deleteMany({ project: { $in: ownedIds } }),
    Project.deleteMany({ owner }),
    Activity.deleteMany({ $or: [{ owner }, { project: { $in: ownedIds } }] }),
    Comment.deleteMany({ $or: [{ author: owner }, { project: { $in: ownedIds } }] }),
    // Rời khỏi các dự án người khác đã mời mình vào
    Project.updateMany({ 'members.user': owner }, { $pull: { members: { user: owner } } }),
  ]);
  await user.deleteOne();
  res.json({ data: { deletedProjects: projects.deletedCount, deletedTasks: tasks.deletedCount } });
}

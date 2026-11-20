/**
 * Seed dữ liệu mẫu cho TaskFlow.
 *   npm run seed         -> xoá TOÀN BỘ người dùng, dự án, task, hoạt động rồi thêm dữ liệu mẫu
 *   npm run seed:clear   -> chỉ xoá toàn bộ dữ liệu
 * Khi database không nằm trên máy (vd MongoDB Atlas) script sẽ hỏi xác nhận.
 * Thêm --yes để bỏ qua câu hỏi: npm run seed -- --yes
 */
import { createInterface } from 'node:readline/promises';
import { connectDB, disconnectDB } from '../config/db.js';
import { env } from '../config/env.js';
import { hashPassword } from '../lib/auth.js';
import { Activity } from '../models/Activity.js';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { User } from '../models/User.js';
import { createStarterProject } from '../services/onboarding.js';
import { DEMO_USERS, buildSeed, buildSeedActivity } from './seedData.js';

const clearOnly = process.argv.includes('--clear');
const skipConfirm = process.argv.includes('--yes');

function dbHost(uri) {
  const match = uri.match(/@([^/?]+)/) || uri.match(/\/\/([^/?]+)/);
  return match ? match[1] : 'không rõ';
}

async function confirmRemote() {
  const host = dbHost(env.mongoUri);
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
  if (isLocal || skipConfirm) return;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    `\n[seed] Database: ${host}\n[seed] Lệnh này sẽ XOÁ TOÀN BỘ người dùng và dữ liệu trên database đó.\n[seed] Gõ "yes" để tiếp tục: `
  );
  rl.close();
  if (answer.trim().toLowerCase() !== 'yes') {
    console.log('[seed] Đã huỷ, không có gì bị xoá.');
    process.exit(0);
  }
}

async function run() {
  await confirmRemote();
  await connectDB();

  const results = await Promise.all([User.deleteMany({}), Project.deleteMany({}), Task.deleteMany({}), Activity.deleteMany({})]);
  const [u, p, t, a] = results.map((r) => r.deletedCount);
  console.log(`[seed] Đã xoá ${u} người dùng, ${p} dự án, ${t} task, ${a} hoạt động`);

  if (!clearOnly) {
    const [demo, second] = await Promise.all(
      DEMO_USERS.map(async ({ password, ...info }) => User.create({ ...info, passwordHash: await hashPassword(password) }))
    );

    // Tài khoản demo: đầy đủ 5 dự án mẫu
    const { projects, tasks } = buildSeed();
    const createdProjects = await Project.insertMany(projects.map(({ key, ...rest }) => ({ ...rest, owner: demo._id })));
    const idByKey = new Map(projects.map((proj, i) => [proj.key, createdProjects[i]._id]));

    // insertMany bỏ qua pre('save') nên completedAt đã được đặt sẵn trong seedData
    const createdTasks = await Task.insertMany(
      tasks.map(({ projectKey, ...rest }) => ({ ...rest, owner: demo._id, project: idByKey.get(projectKey) }))
    );
    const projectsById = new Map(createdProjects.map((proj) => [String(proj._id), proj]));
    const activity = await Activity.insertMany(buildSeedActivity(createdTasks, projectsById).map((item) => ({ ...item, owner: demo._id })));

    // Tài khoản thứ hai: chỉ có dự án hướng dẫn, để thấy mỗi người có dữ liệu riêng
    await createStarterProject(second._id);

    const done = createdTasks.filter((task) => task.status === 'done').length;
    console.log(`[seed] Đã thêm ${createdProjects.length} dự án, ${createdTasks.length} task (${done} đã xong), ${activity.length} hoạt động cho tài khoản demo`);
    console.log('\n[seed] Tài khoản để đăng nhập thử:');
    for (const user of DEMO_USERS) console.log(`        ${user.email.padEnd(22)} mật khẩu: ${user.password}${user.isDemo ? '   (demo công khai)' : ''}`);
    console.log('');
  }

  await disconnectDB();
}

run().catch(async (err) => {
  console.error('[seed] Lỗi:', err.message);
  await disconnectDB().catch(() => {});
  process.exit(1);
});

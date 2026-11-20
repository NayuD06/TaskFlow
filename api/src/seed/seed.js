/**
 * Seed dữ liệu mẫu cho TaskFlow.
 *   npm run seed         -> xoá toàn bộ dự án, task, hoạt động rồi thêm dữ liệu mẫu
 *   npm run seed:clear   -> chỉ xoá toàn bộ dữ liệu
 */
import { connectDB, disconnectDB } from '../config/db.js';
import { Activity } from '../models/Activity.js';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { buildSeed, buildSeedActivity } from './seedData.js';

const clearOnly = process.argv.includes('--clear');

async function run() {
  await connectDB();

  const [p, t, a] = await Promise.all([Project.deleteMany({}), Task.deleteMany({}), Activity.deleteMany({})]);
  console.log(`[seed] Đã xoá ${p.deletedCount} dự án, ${t.deletedCount} task, ${a.deletedCount} hoạt động`);

  if (!clearOnly) {
    const { projects, tasks } = buildSeed();

    const createdProjects = await Project.insertMany(projects.map(({ key, ...rest }) => rest));
    const idByKey = new Map(projects.map((proj, i) => [proj.key, createdProjects[i]._id]));

    // insertMany bỏ qua pre('save') nên completedAt đã được đặt sẵn trong seedData
    const createdTasks = await Task.insertMany(
      tasks.map(({ projectKey, ...rest }) => ({ ...rest, project: idByKey.get(projectKey) }))
    );

    const projectsById = new Map(createdProjects.map((proj) => [String(proj._id), proj]));
    const activity = await Activity.insertMany(buildSeedActivity(createdTasks, projectsById));

    const done = createdTasks.filter((task) => task.status === 'done').length;
    console.log(
      `[seed] Đã thêm ${createdProjects.length} dự án, ${createdTasks.length} task (${done} đã xong), ${activity.length} hoạt động`
    );
  }

  await disconnectDB();
}

run().catch(async (err) => {
  console.error('[seed] Lỗi:', err.message);
  await disconnectDB().catch(() => {});
  process.exit(1);
});

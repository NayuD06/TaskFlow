// Xoá hẳn một tài khoản cùng dữ liệu của họ. Dùng khi người dùng tự xoá tài khoản và khi quản trị viên xoá.
import { Activity } from '../models/Activity.js';
import { Comment } from '../models/Comment.js';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { User } from '../models/User.js';

/** Trả về số dự án và công việc đã xoá. Dự án người khác chia sẻ thì chỉ rời khỏi, không xoá. */
export async function deleteUserData(userId) {
  const ownedIds = await Project.find({ owner: userId }).distinct('_id');
  const [tasks, projects] = await Promise.all([
    Task.deleteMany({ project: { $in: ownedIds } }),
    Project.deleteMany({ owner: userId }),
    Activity.deleteMany({ $or: [{ owner: userId }, { project: { $in: ownedIds } }] }),
    Comment.deleteMany({ $or: [{ author: userId }, { project: { $in: ownedIds } }] }),
    Project.updateMany({ 'members.user': userId }, { $pull: { members: { user: userId } } }),
  ]);
  await User.deleteOne({ _id: userId });
  return { projects: projects.deletedCount, tasks: tasks.deletedCount };
}

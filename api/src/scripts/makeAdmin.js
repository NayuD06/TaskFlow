// Cấp hoặc bỏ quyền quản trị cho một tài khoản đã đăng ký.
//   npm run make-admin -- ban@email.com           cấp quyền
//   npm run make-admin -- ban@email.com --remove  bỏ quyền
// Lệnh dùng MONGODB_URI trong api/.env, nên muốn đổi trên Atlas thì .env phải trỏ tới Atlas.
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { User } from '../models/User.js';

const args = process.argv.slice(2);
const email = (args.find((a) => !a.startsWith('--')) || '').trim().toLowerCase();
const remove = args.includes('--remove');

if (!email) {
  console.error('Cách dùng: npm run make-admin -- ban@email.com [--remove]');
  process.exit(1);
}

await mongoose.connect(env.mongoUri);
const user = await User.findOneAndUpdate({ email }, { role: remove ? 'user' : 'admin' }, { new: true });
if (!user) {
  console.error(`Không có tài khoản nào dùng email ${email}. Hãy đăng ký trên web trước.`);
  process.exitCode = 1;
} else {
  console.log(remove ? `Đã bỏ quyền quản trị của ${user.name}.` : `${user.name} giờ là quản trị viên. Đăng nhập trang admin bằng tài khoản này nhé.`);
}
await mongoose.disconnect();

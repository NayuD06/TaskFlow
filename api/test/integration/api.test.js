// Test đầy đủ với MongoDB thật. Chỉ chạy khi có MONGODB_URI_TEST (GitHub Actions tự dựng MongoDB).
// Chạy trên máy: MONGODB_URI_TEST=mongodb://127.0.0.1:27017/taskflow_test npm test
// CẢNH BÁO: database này bị xoá sạch mỗi lần chạy, đừng trỏ vào database thật.
import '../setup.js';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { setGoogleVerifier } from '../../src/lib/google.js';
import { Comment } from '../../src/models/Comment.js';
import { Project } from '../../src/models/Project.js';
import { Task } from '../../src/models/Task.js';
import { User } from '../../src/models/User.js';
import { setCloudinaryFetch } from '../../src/services/cloudinary.js';
import { outbox } from '../../src/services/mailer.js';

const uri = process.env.MONGODB_URI_TEST;
const skip = !uri && 'Bỏ qua: chưa đặt MONGODB_URI_TEST';
if (uri && !/test/i.test(uri)) throw new Error('MONGODB_URI_TEST phải là database dành riêng cho test (tên có chữ "test")');

const app = createApp();
const api = () => request(app);
const auth = (token) => ({ Authorization: `Bearer ${token}` });

async function register(name, email, password = 'matkhau123') {
  const res = await api().post('/api/auth/register').send({ name, email, password }).expect(201);
  return { ...res.body.data, id: res.body.data.user._id, email, password };
}

describe('API với MongoDB', { skip }, () => {
  let an;
  let binh;
  let chi;
  let project;

  before(async () => {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    await mongoose.connection.dropDatabase();
    await mongoose.connection.syncIndexes();
  });

  after(async () => {
    setGoogleVerifier(null);
    setCloudinaryFetch(null);
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  describe('tài khoản', () => {
    it('đăng ký tạo sẵn dự án hướng dẫn', async () => {
      an = await register('Duy An', 'an@example.com');
      assert.equal(an.user.hasPassword, true);
      assert.ok(an.token);
      const res = await api().get('/api/projects').set(auth(an.token)).expect(200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].role, 'owner');
    });

    it('không cho đăng ký trùng email', async () => {
      await api().post('/api/auth/register').send({ name: 'An 2', email: 'AN@example.com', password: 'matkhau123' }).expect(409);
    });

    it('đăng nhập đúng và sai mật khẩu', async () => {
      await api().post('/api/auth/login').send({ email: 'an@example.com', password: 'sai123456' }).expect(401);
      const res = await api().post('/api/auth/login').send({ email: 'an@example.com', password: 'matkhau123' }).expect(200);
      assert.equal(res.body.data.user.email, 'an@example.com');
      assert.equal(res.body.data.user.passwordHash, undefined);
    });

    it('/health báo ok khi đã kết nối database', async () => {
      const res = await api().get('/api/health').expect(200);
      assert.equal(res.body.db, 'connected');
    });
  });

  describe('quên mật khẩu', () => {
    it('gửi email có liên kết, không lộ email chưa đăng ký', async () => {
      outbox.length = 0;
      await api().post('/api/auth/forgot-password').send({ email: 'khongco@example.com' }).expect(200);
      assert.equal(outbox.length, 0);
      await api().post('/api/auth/forgot-password').send({ email: 'an@example.com' }).expect(200);
      assert.equal(outbox.length, 1);
      assert.equal(outbox[0].to, 'an@example.com');
      assert.match(outbox[0].html, /http:\/\/localhost:5173\/reset-password\?token=/);
    });

    it('đặt mật khẩu mới bằng liên kết, liên kết chỉ dùng được một lần', async () => {
      const token = outbox[0].text.match(/token=([\w-]+)/)[1];
      const res = await api().post('/api/auth/reset-password').send({ token, password: 'moi1234567' }).expect(200);
      assert.ok(res.body.data.token);
      // Token đăng nhập cũ bị vô hiệu
      await api().get('/api/auth/me').set(auth(an.token)).expect(401);
      an.token = res.body.data.token;
      await api().post('/api/auth/reset-password').send({ token, password: 'khac1234567' }).expect(400);
      await api().post('/api/auth/login').send({ email: 'an@example.com', password: 'moi1234567' }).expect(200);
    });

    it('liên kết hết hạn thì không dùng được', async () => {
      outbox.length = 0;
      await api().post('/api/auth/forgot-password').send({ email: 'an@example.com' }).expect(200);
      const token = outbox[0].text.match(/token=([\w-]+)/)[1];
      await User.updateOne({ email: 'an@example.com' }, { resetTokenExpires: new Date(Date.now() - 1000) });
      await api().post('/api/auth/reset-password').send({ token, password: 'khac1234567' }).expect(400);
    });
  });

  describe('đăng nhập Google', () => {
    before(() => {
      setGoogleVerifier(async (credential) => {
        if (credential === 'bad') throw Object.assign(new Error('bad'), { status: 401 });
        const [sub, email, verified = 'yes'] = credential.split('|');
        return { sub, email, emailVerified: verified === 'yes', name: 'Người Google' };
      });
    });

    it('tạo tài khoản mới chưa có mật khẩu', async () => {
      const res = await api().post('/api/auth/google').send({ credential: 'g-1|google@example.com' }).expect(201);
      assert.equal(res.body.data.created, true);
      assert.equal(res.body.data.user.hasPassword, false);
      // Lần sau đăng nhập lại bằng Google
      const again = await api().post('/api/auth/google').send({ credential: 'g-1|google@example.com' }).expect(200);
      assert.equal(again.body.data.user._id, res.body.data.user._id);
      // Đặt mật khẩu lần đầu không cần mật khẩu cũ
      const set = await api().post('/api/auth/change-password').set(auth(again.body.data.token)).send({ newPassword: 'google12345' }).expect(200);
      assert.equal(set.body.data.user.hasPassword, true);
    });

    it('liên kết với tài khoản đã có cùng email', async () => {
      const res = await api().post('/api/auth/google').send({ credential: 'g-2|an@example.com' }).expect(200);
      assert.equal(res.body.data.user._id, an.id);
    });

    it('từ chối email chưa xác minh và token sai', async () => {
      await api().post('/api/auth/google').send({ credential: 'g-3|x@example.com|no' }).expect(401);
      await api().post('/api/auth/google').send({ credential: 'bad' }).expect(401);
    });
  });

  describe('dự án và công việc', () => {
    it('tạo dự án và công việc', async () => {
      const res = await api().post('/api/projects').set(auth(an.token)).send({ name: 'Đồ án', color: 'violet' }).expect(201);
      project = res.body.data;
      assert.equal(project.role, 'owner');
      const task = await api()
        .post('/api/tasks')
        .set(auth(an.token))
        .send({ project: project._id, title: 'Viết báo cáo', priority: 'high', tags: ['#báo cáo'] })
        .expect(201);
      assert.equal(task.body.data.project.name, 'Đồ án');
      assert.equal(task.body.data.commentCount, 0);
      assert.deepEqual(task.body.data.tags, ['báo cáo']);
    });

    it('người lạ không thấy dự án của người khác (404)', async () => {
      chi = await register('Chi Lê', 'chi@example.com');
      await api().get(`/api/projects/${project._id}`).set(auth(chi.token)).expect(404);
      await api().post('/api/tasks').set(auth(chi.token)).send({ project: project._id, title: 'Xâm nhập' }).expect(404);
      const list = await api().get(`/api/tasks?project=${project._id}`).set(auth(chi.token)).expect(200);
      assert.equal(list.body.data.length, 0);
    });
  });

  describe('việc lặp lại', () => {
    it('hoàn thành thì tự tạo lần tiếp theo, chỉ một lần', async () => {
      const deadline = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
      const created = await api()
        .post('/api/tasks')
        .set(auth(an.token))
        .send({ project: project._id, title: 'Họp nhóm', repeat: 'weekly', deadline, checklist: [{ text: 'Chuẩn bị', done: true }] })
        .expect(201);
      const id = created.body.data._id;
      assert.equal(created.body.data.repeat, 'weekly');

      const done = await api().patch(`/api/tasks/${id}/toggle?tzOffset=-420`).set(auth(an.token)).expect(200);
      const next = done.body.data.nextOccurrence;
      assert.ok(next, 'phải có lần tiếp theo');
      assert.equal(new Date(next.deadline).getTime() - new Date(deadline).getTime(), 7 * 24 * 3600 * 1000);
      const nextTask = await Task.findById(next._id).lean();
      assert.equal(nextTask.status, 'todo');
      assert.equal(nextTask.checklist[0].done, false);

      // Mở lại rồi hoàn thành lần nữa không tạo thêm bản sao
      await api().patch(`/api/tasks/${id}/toggle`).set(auth(an.token)).expect(200);
      const again = await api().patch(`/api/tasks/${id}/toggle`).set(auth(an.token)).expect(200);
      assert.equal(again.body.data.nextOccurrence, undefined);
      assert.equal(await Task.countDocuments({ title: 'Họp nhóm' }), 2);
    });

    it('kéo sang cột Đã xong cũng tạo lần tiếp theo', async () => {
      const created = await api().post('/api/tasks').set(auth(an.token)).send({ project: project._id, title: 'Tưới cây', repeat: 'daily' }).expect(201);
      const moved = await api().post(`/api/tasks/${created.body.data._id}/move`).set(auth(an.token)).send({ status: 'done', index: 0 }).expect(200);
      assert.ok(moved.body.data.nextOccurrence);
    });
  });

  describe('chia sẻ dự án', () => {
    it('mời người đã có tài khoản: vào dự án ngay', async () => {
      binh = await register('Bình Trần', 'binh@example.com');
      outbox.length = 0;
      const res = await api().post(`/api/projects/${project._id}/members`).set(auth(an.token)).send({ email: 'BINH@example.com' }).expect(201);
      assert.equal(res.body.data.result, 'added');
      assert.equal(res.body.data.members.length, 1);
      assert.equal(outbox.length, 1);
      assert.match(outbox[0].subject, /Đồ án/);

      const list = await api().get('/api/projects').set(auth(binh.token)).expect(200);
      const shared = list.body.data.find((p) => p._id === project._id);
      assert.equal(shared.role, 'member');
      assert.equal(shared.ownerInfo.name, 'Duy An');
      assert.equal(shared.inviteCount, undefined);
    });

    it('mời email chưa đăng ký: tự vào dự án khi đăng ký', async () => {
      const res = await api().post(`/api/projects/${project._id}/members`).set(auth(an.token)).send({ email: 'dung@example.com' }).expect(201);
      assert.equal(res.body.data.result, 'invited');
      assert.match(outbox.at(-1).html, /register\?email=dung%40example\.com/);
      await api().post(`/api/projects/${project._id}/members`).set(auth(an.token)).send({ email: 'dung@example.com' }).expect(400);

      const dung = await register('Dũng', 'dung@example.com');
      const list = await api().get('/api/projects').set(auth(dung.token)).expect(200);
      assert.ok(list.body.data.some((p) => p._id === project._id));
      const members = await api().get(`/api/projects/${project._id}/members`).set(auth(an.token)).expect(200);
      assert.equal(members.body.data.invites.length, 0);
      assert.equal(members.body.data.members.length, 2);
      // Dũng rời dự án
      await api().delete(`/api/projects/${project._id}/members/${dung.id}`).set(auth(dung.token)).expect(200);
      await api().get(`/api/projects/${project._id}`).set(auth(dung.token)).expect(404);
    });

    it('thành viên làm việc được nhưng không sửa, xoá dự án hay mời người', async () => {
      const task = await api().post('/api/tasks').set(auth(binh.token)).send({ project: project._id, title: 'Việc của Bình' }).expect(201);
      const stored = await Task.findById(task.body.data._id).lean();
      assert.equal(String(stored.owner), an.id); // dữ liệu thuộc chủ dự án
      assert.equal(String(stored.createdBy), binh.id);

      await api().patch(`/api/projects/${project._id}`).set(auth(binh.token)).send({ name: 'Đổi tên' }).expect(403);
      await api().delete(`/api/projects/${project._id}`).set(auth(binh.token)).expect(403);
      await api().post(`/api/projects/${project._id}/members`).set(auth(binh.token)).send({ email: 'x@example.com' }).expect(403);
      await api().delete(`/api/projects/${project._id}/members/${an.id}`).set(auth(binh.token)).expect(403);
      await api().delete(`/api/projects/${project._id}/members/${an.id}`).set(auth(an.token)).expect(400);

      const tasks = await api().get('/api/tasks').set(auth(binh.token)).expect(200);
      assert.ok(tasks.body.data.some((t) => t.title === 'Viết báo cáo'));
      const dash = await api().get('/api/dashboard').set(auth(binh.token)).expect(200);
      assert.ok(dash.body.data);
    });

    it('hoạt động của dự án chung hiện cho cả hai người, ghi rõ ai làm', async () => {
      const res = await api().get('/api/activity?limit=100').set(auth(an.token)).expect(200);
      const byBinh = res.body.data.find((a) => a.taskTitle === 'Việc của Bình');
      assert.equal(byBinh.actorName, 'Bình Trần');
      assert.equal(byBinh.mine, false);
      const binhView = await api().get('/api/activity?limit=100').set(auth(binh.token)).expect(200);
      assert.ok(binhView.body.data.some((a) => a.taskTitle === 'Viết báo cáo'));
      // Chi không thấy gì của dự án này
      const chiView = await api().get('/api/activity?limit=100').set(auth(chi.token)).expect(200);
      assert.ok(!chiView.body.data.some((a) => a.projectName === 'Đồ án'));
    });
  });

  describe('bình luận, ảnh, Pomodoro', () => {
    let taskId;
    let commentId;

    before(async () => {
      taskId = String((await Task.findOne({ title: 'Viết báo cáo' }))._id);
    });

    it('thành viên bình luận, số bình luận hiện trên công việc', async () => {
      const res = await api().post(`/api/tasks/${taskId}/comments`).set(auth(binh.token)).send({ text: '  Mình làm phần 2 nhé  ' }).expect(201);
      commentId = res.body.data._id;
      assert.equal(res.body.data.text, 'Mình làm phần 2 nhé');
      assert.equal(res.body.data.author.name, 'Bình Trần');
      await api().post(`/api/tasks/${taskId}/comments`).set(auth(an.token)).send({ text: 'Ok' }).expect(201);
      const list = await api().get(`/api/tasks/${taskId}/comments`).set(auth(an.token)).expect(200);
      assert.deepEqual(list.body.data.map((c) => c.text), ['Mình làm phần 2 nhé', 'Ok']);
      const task = await api().get(`/api/tasks/${taskId}`).set(auth(an.token)).expect(200);
      assert.equal(task.body.data.commentCount, 2);
      await api().get(`/api/tasks/${taskId}/comments`).set(auth(chi.token)).expect(404);
    });

    it('chỉ người viết hoặc chủ dự án xoá được bình luận', async () => {
      const mine = await api().post(`/api/tasks/${taskId}/comments`).set(auth(an.token)).send({ text: 'Của An' }).expect(201);
      await api().delete(`/api/tasks/${taskId}/comments/${mine.body.data._id}`).set(auth(binh.token)).expect(403);
      await api().delete(`/api/tasks/${taskId}/comments/${commentId}`).set(auth(an.token)).expect(200);
      assert.equal(await Comment.countDocuments({ task: taskId }), 2);
    });

    it('gắn và gỡ ảnh Cloudinary, tối đa 10 ảnh', async () => {
      const url = 'https://res.cloudinary.com/taskflow-test/image/upload/v1/taskflow/a.jpg';
      await api().post(`/api/tasks/${taskId}/attachments`).set(auth(binh.token)).send({ url: 'https://evil.com/a.jpg' }).expect(400);
      const res = await api().post(`/api/tasks/${taskId}/attachments`).set(auth(binh.token)).send({ url, name: 'a.jpg', width: 800, height: 600 }).expect(201);
      assert.equal(res.body.data.attachments.length, 1);
      const attachmentId = res.body.data.attachments[0]._id;
      for (let i = 1; i < 10; i += 1) await api().post(`/api/tasks/${taskId}/attachments`).set(auth(an.token)).send({ url }).expect(201);
      await api().post(`/api/tasks/${taskId}/attachments`).set(auth(an.token)).send({ url }).expect(400);
      const removed = await api().delete(`/api/tasks/${taskId}/attachments/${attachmentId}`).set(auth(an.token)).expect(200);
      assert.equal(removed.body.data.attachments.length, 9);
    });

    it('ghi lại phiên Pomodoro', async () => {
      await api().post(`/api/tasks/${taskId}/pomodoros`).set(auth(an.token)).send({ minutes: 25 }).expect(200);
      const res = await api().post(`/api/tasks/${taskId}/pomodoros`).set(auth(binh.token)).send({ minutes: 50 }).expect(200);
      assert.equal(res.body.data.pomodoros, 2);
      assert.equal(res.body.data.focusMinutes, 75);
      await api().post(`/api/tasks/${taskId}/pomodoros`).set(auth(an.token)).send({ minutes: 500 }).expect(400);
    });

    it('xoá công việc xoá luôn bình luận', async () => {
      const t = await api().post('/api/tasks').set(auth(an.token)).send({ project: project._id, title: 'Tạm' }).expect(201);
      await api().post(`/api/tasks/${t.body.data._id}/comments`).set(auth(an.token)).send({ text: 'x' }).expect(201);
      await api().delete(`/api/tasks/${t.body.data._id}`).set(auth(an.token)).expect(200);
      assert.equal(await Comment.countDocuments({ task: t.body.data._id }), 0);
    });
  });

  describe('xuất, nhập dữ liệu', () => {
    let exported;

    it('xuất JSON chỉ gồm dự án của mình', async () => {
      const res = await api().get('/api/export?format=json').set(auth(an.token)).expect(200);
      assert.match(res.headers['content-disposition'], /attachment; filename="taskflow-\d{4}-\d{2}-\d{2}\.json"/);
      exported = res.body;
      assert.equal(exported.app, 'TaskFlow');
      assert.ok(exported.projects.some((p) => p.name === 'Đồ án'));
      const binhExport = await api().get('/api/export').set(auth(binh.token)).expect(200);
      assert.ok(!binhExport.body.projects.some((p) => p.name === 'Đồ án'));
    });

    it('xuất CSV', async () => {
      const res = await api().get('/api/export?format=csv&lang=en').set(auth(an.token)).buffer(true).parse((r, cb) => {
        let data = '';
        r.setEncoding('utf8');
        r.on('data', (c) => (data += c));
        r.on('end', () => cb(null, data));
      });
      assert.equal(res.status, 200);
      assert.match(res.headers['content-type'], /text\/csv/);
      assert.ok(res.body.startsWith('﻿Project,Task'));
      assert.match(res.body, /Đồ án,Viết báo cáo/);
    });

    it('nhập lại file JSON vào tài khoản khác (thêm mới, không ghi đè)', async () => {
      const res = await api().post('/api/import').set(auth(chi.token)).send(exported).expect(201);
      const total = exported.projects.reduce((n, p) => n + p.tasks.length, 0);
      assert.equal(res.body.data.projects, exported.projects.length);
      assert.equal(res.body.data.tasks, total);
      const projects = await Project.find({ owner: chi.id }).lean();
      assert.equal(projects.length, exported.projects.length + 1); // + dự án hướng dẫn của Chi
      await api().post('/api/import').set(auth(chi.token)).send({ foo: 'bar' }).expect(400);
    });
  });

  describe('quản trị', () => {
    let boss;
    let boss2;
    const deletes = [];
    const cloud = (id) => ({
      public_id: id,
      secure_url: `https://res.cloudinary.com/taskflow-test/image/upload/v1/${id}.jpg`,
      format: 'jpg',
      bytes: 1000,
      width: 10,
      height: 10,
      created_at: '2026-11-01T00:00:00Z',
    });

    before(async () => {
      boss = await register('Sếp', 'boss@example.com');
      boss2 = await register('Sếp Hai', 'boss2@example.com');
      setCloudinaryFetch(async (url, opts) => {
        const json = async () => body;
        let body;
        if (opts.method === 'DELETE') {
          const ids = new URL(url).searchParams.getAll('public_ids[]');
          deletes.push(...ids);
          body = { deleted: Object.fromEntries(ids.map((id) => [id, 'deleted'])) };
        } else if (url.includes('/usage')) {
          body = { plan: 'Free', storage: { usage: 3000 } };
        } else {
          body = { resources: [cloud('taskflow/a'), cloud('taskflow/tasks/orphan'), cloud('other/project/x')] };
        }
        return { ok: true, status: 200, json };
      });
    });

    it('email trong ADMIN_EMAILS là admin, người khác bị chặn', async () => {
      assert.equal(boss.user.role, 'admin');
      assert.equal(an.user.role, 'user');
      await api().get('/api/admin/stats').set(auth(an.token)).expect(403);
      const res = await api().get('/api/admin/stats?tzOffset=-420').set(auth(boss.token)).expect(200);
      assert.ok(res.body.data.users.total >= 5);
      assert.equal(res.body.data.users.admins, 2);
      assert.equal(res.body.data.days.length, 14);
      assert.ok(res.body.data.images.total >= 9);
      assert.equal(res.body.data.integrations.cloudinaryAdmin, true);
      assert.equal(res.body.data.integrations.mail, false);
    });

    it('tìm và lọc người dùng', async () => {
      const res = await api().get('/api/admin/users').query({ q: 'AN@exa' }).set(auth(boss.token)).expect(200);
      assert.equal(res.body.total, 1);
      assert.equal(res.body.data[0].email, 'an@example.com');
      assert.ok(res.body.data[0].projects >= 2);
      assert.ok(res.body.data[0].tasks >= 1);
      assert.equal(res.body.data[0].passwordHash, undefined);
      const admins = await api().get('/api/admin/users?filter=admin').set(auth(boss.token)).expect(200);
      assert.deepEqual(admins.body.data.map((u) => u.email).sort(), ['boss2@example.com', 'boss@example.com']);
      assert.ok(admins.body.data.every((u) => u.envAdmin));
    });

    it('không tự khoá mình, không đổi được admin trong ADMIN_EMAILS', async () => {
      await api().patch(`/api/admin/users/${boss.id}`).set(auth(boss.token)).send({ disabled: true }).expect(400);
      await api().patch(`/api/admin/users/${boss2.id}`).set(auth(boss.token)).send({ role: 'user' }).expect(400);
      await api().delete(`/api/admin/users/${boss2.id}`).set(auth(boss.token)).expect(400);
      await api().patch(`/api/admin/users/${an.id}`).set(auth(boss.token)).send({ role: 'god' }).expect(400);
      await api().patch('/api/admin/users/khong-phai-id').set(auth(boss.token)).send({ disabled: true }).expect(404);
    });

    it('khoá tài khoản: không gọi API, không đăng nhập được; mở khoá thì đăng nhập lại được', async () => {
      const locked = await api().patch(`/api/admin/users/${chi.id}`).set(auth(boss.token)).send({ disabled: true }).expect(200);
      assert.equal(locked.body.data.disabled, true);
      await api().get('/api/projects').set(auth(chi.token)).expect(401); // token cũ bị vô hiệu
      const login = await api().post('/api/auth/login').send({ email: chi.email, password: chi.password }).expect(403);
      assert.match(login.body.error.message, /bị khoá/);
      outbox.length = 0;
      await api().post('/api/auth/forgot-password').send({ email: chi.email }).expect(200);
      assert.equal(outbox.length, 0);
      await api().patch(`/api/admin/users/${chi.id}`).set(auth(boss.token)).send({ disabled: false }).expect(200);
      const again = await api().post('/api/auth/login').send({ email: chi.email, password: chi.password }).expect(200);
      chi.token = again.body.data.token;
    });

    it('cấp rồi bỏ quyền admin', async () => {
      await api().patch(`/api/admin/users/${an.id}`).set(auth(boss.token)).send({ role: 'admin' }).expect(200);
      const me = await api().get('/api/auth/me').set(auth(an.token)).expect(200);
      assert.equal(me.body.data.role, 'admin');
      await api().get('/api/admin/users').set(auth(an.token)).expect(200);
      await api().patch(`/api/admin/users/${an.id}`).set(auth(boss.token)).send({ role: 'user' }).expect(200);
      await api().get('/api/admin/users').set(auth(an.token)).expect(403);
    });

    it('liệt kê ảnh trên Cloudinary kèm nơi đang dùng', async () => {
      const res = await api().get('/api/admin/images?refresh=1').set(auth(boss.token)).expect(200);
      const { configured, items, totals, usage } = res.body.data;
      assert.equal(configured, true);
      assert.deepEqual(items.map((i) => i.publicId).sort(), ['taskflow/a', 'taskflow/tasks/orphan']);
      assert.equal(totals.unused, 1);
      const used = items.find((i) => i.publicId === 'taskflow/a');
      assert.equal(used.usage.length, 9);
      assert.equal(used.usage[0].title, 'Viết báo cáo');
      assert.equal(used.usage[0].projectName, 'Đồ án');
      assert.equal(usage.plan, 'Free');
      const unused = await api().get('/api/admin/images?filter=unused').set(auth(boss.token)).expect(200);
      assert.deepEqual(unused.body.data.items.map((i) => i.publicId), ['taskflow/tasks/orphan']);
      const search = await api().get('/api/admin/images').query({ q: 'báo cáo' }).set(auth(boss.token)).expect(200);
      assert.deepEqual(search.body.data.items.map((i) => i.publicId), ['taskflow/a']);
    });

    it('xoá ảnh không dùng; ảnh đang dùng cần xác nhận và được gỡ khỏi công việc', async () => {
      await api().delete('/api/admin/images').set(auth(boss.token)).send({ publicIds: ['other/project/x'] }).expect(400);
      await api().delete('/api/admin/images').set(auth(boss.token)).send({ publicIds: [] }).expect(400);
      const ok = await api().delete('/api/admin/images').set(auth(boss.token)).send({ publicIds: ['taskflow/tasks/orphan'] }).expect(200);
      assert.deepEqual(ok.body.data.deleted, ['taskflow/tasks/orphan']);
      await api().delete('/api/admin/images').set(auth(boss.token)).send({ publicIds: ['taskflow/a'] }).expect(409);
      assert.ok(!deletes.includes('taskflow/a'));
      const forced = await api().delete('/api/admin/images').set(auth(boss.token)).send({ publicIds: ['taskflow/a'], force: true }).expect(200);
      assert.equal(forced.body.data.detached, 9);
      assert.ok(deletes.includes('taskflow/a'));
      const task = await Task.findOne({ title: 'Viết báo cáo' }).lean();
      assert.equal(task.attachments.length, 0);
      await api().delete('/api/admin/images').set(auth(an.token)).send({ publicIds: ['taskflow/a'] }).expect(403);
    });

    it('xoá tài khoản người dùng cùng dữ liệu của họ', async () => {
      const res = await api().delete(`/api/admin/users/${chi.id}`).set(auth(boss.token)).expect(200);
      assert.ok(res.body.data.deletedProjects >= 1);
      assert.equal(await User.countDocuments({ email: chi.email }), 0);
      assert.equal(await Project.countDocuments({ owner: chi.id }), 0);
      await api().get('/api/auth/me').set(auth(chi.token)).expect(401);
    });
  });

  describe('xoá', () => {
    it('chủ dự án xoá dự án thì xoá luôn công việc và bình luận', async () => {
      const p = await api().post('/api/projects').set(auth(an.token)).send({ name: 'Tạm thời' }).expect(201);
      const t = await api().post('/api/tasks').set(auth(an.token)).send({ project: p.body.data._id, title: 'x' }).expect(201);
      await api().post(`/api/tasks/${t.body.data._id}/comments`).set(auth(an.token)).send({ text: 'x' }).expect(201);
      await api().delete(`/api/projects/${p.body.data._id}`).set(auth(an.token)).expect(200);
      assert.equal(await Task.countDocuments({ project: p.body.data._id }), 0);
      assert.equal(await Comment.countDocuments({ project: p.body.data._id }), 0);
    });

    it('xoá tài khoản thành viên: rời các dự án được mời, dự án của người khác vẫn còn', async () => {
      await api().delete('/api/auth/me').set(auth(binh.token)).send({ password: 'sai' }).expect(400);
      await api().delete('/api/auth/me').set(auth(binh.token)).send({ password: binh.password }).expect(200);
      const p = await Project.findById(project._id).lean();
      assert.equal(p.members.length, 0);
      assert.ok(await Task.exists({ title: 'Việc của Bình' }));
      await api().get('/api/auth/me').set(auth(binh.token)).expect(401);
    });

    it('xoá tài khoản chưa có mật khẩu cần gõ đúng email', async () => {
      const g = await api().post('/api/auth/google').send({ credential: 'g-9|nopass@example.com' }).expect(201);
      const token = g.body.data.token;
      await api().delete('/api/auth/me').set(auth(token)).send({ confirm: 'sai@example.com' }).expect(400);
      await api().delete('/api/auth/me').set(auth(token)).send({ confirm: 'NOPASS@example.com' }).expect(200);
      assert.equal(await User.countDocuments({ email: 'nopass@example.com' }), 0);
    });
  });
});

// Kiểm tra HTTP không cần database: route hệ thống, tài liệu API, xác thực và kiểm tra dữ liệu đầu vào.
import '../setup.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../../src/app.js';

const app = createApp();

describe('route hệ thống', () => {
  it('/ trỏ tới tài liệu API', async () => {
    const res = await request(app).get('/').expect(200);
    assert.equal(res.body.docs, '/api/docs');
  });

  it('/api/health báo 503 khi chưa kết nối database', async () => {
    const res = await request(app).get('/api/health').expect(503);
    assert.equal(res.body.db, 'disconnected');
  });

  it('route không tồn tại trả về 404 dạng JSON', async () => {
    const res = await request(app).get('/khong-co').expect(404);
    assert.match(res.body.error.message, /Không có route/);
  });

  it('/api/config trả về cấu hình công khai, không lộ khoá bí mật', async () => {
    const res = await request(app).get('/api/config').expect(200);
    assert.deepEqual(res.body.data, {
      googleClientId: 'test-client.apps.googleusercontent.com',
      uploads: { provider: 'cloudinary', cloudName: 'taskflow-test', uploadPreset: 'taskflow_unsigned' },
      mail: false,
    });
  });

  it('CORS chỉ cho phép web của mình', async () => {
    const ok = await request(app).get('/api/config').set('Origin', 'http://localhost:5173');
    assert.equal(ok.headers['access-control-allow-origin'], 'http://localhost:5173');
    const bad = await request(app).get('/api/config').set('Origin', 'https://evil.example');
    assert.equal(bad.headers['access-control-allow-origin'], undefined);
  });
});

describe('tài liệu API', () => {
  it('/api/docs.json là OpenAPI 3.1 hợp lệ và có đủ các nhóm route', async () => {
    const res = await request(app).get('/api/docs.json').expect(200);
    assert.equal(res.body.openapi, '3.1.0');
    for (const path of ['/api/auth/google', '/api/auth/forgot-password', '/api/projects/{id}/members', '/api/tasks/{id}/comments', '/api/tasks/{id}/pomodoros', '/api/export', '/api/import', '/api/admin/users/{id}', '/api/admin/images']) {
      assert.ok(res.body.paths[path], `thiếu ${path}`);
    }
    // Mọi $ref đều trỏ tới schema có thật
    const refs = JSON.stringify(res.body).match(/#\/components\/schemas\/\w+/g) || [];
    for (const ref of new Set(refs)) assert.ok(res.body.components.schemas[ref.split('/').pop()], `thiếu ${ref}`);
  });

  it('/api/docs mở được giao diện Swagger UI', async () => {
    const res = await request(app).get('/api/docs/').expect(200);
    assert.match(res.text, /swagger-ui/);
    assert.match(res.text, /TaskFlow API/);
  });
});

describe('xác thực', () => {
  for (const [method, path] of [
    ['get', '/api/tasks'],
    ['get', '/api/projects'],
    ['get', '/api/dashboard'],
    ['get', '/api/export'],
    ['post', '/api/import'],
    ['get', '/api/auth/me'],
    ['post', '/api/tasks/abc/comments'],
    ['post', '/api/projects/abc/members'],
    ['get', '/api/admin/stats'],
    ['get', '/api/admin/images'],
    ['delete', '/api/admin/users/abc'],
  ]) {
    it(`${method.toUpperCase()} ${path} cần đăng nhập`, async () => {
      await request(app)[method](path).expect(401);
    });
  }

  it('token giả bị từ chối', async () => {
    await request(app).get('/api/tasks').set('Authorization', 'Bearer abc.def.ghi').expect(401);
  });
});

describe('kiểm tra dữ liệu đầu vào (trước khi đụng database)', () => {
  it('đăng ký thiếu thông tin báo lỗi từng trường', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'A', email: 'x', password: '1' }).expect(400);
    assert.deepEqual(Object.keys(res.body.error.fields).sort(), ['email', 'name', 'password']);
  });

  it('quên mật khẩu cần email hợp lệ', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'abc' }).expect(400);
    assert.ok(res.body.error.fields.email);
  });

  it('đặt lại mật khẩu cần token', async () => {
    const res = await request(app).post('/api/auth/reset-password').send({ password: 'abc12345' }).expect(400);
    assert.ok(res.body.error.fields.token);
  });

  it('đăng nhập Google cần credential', async () => {
    await request(app).post('/api/auth/google').send({}).expect(400);
  });

  it('JSON sai cú pháp trả về 400', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":').expect(400);
    assert.match(res.body.error.message, /JSON/);
  });

  it('body quá lớn trả về 413', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.co', password: 'x'.repeat(200_000) }).expect(413);
    assert.match(res.body.error.message, /quá lớn/);
  });
});

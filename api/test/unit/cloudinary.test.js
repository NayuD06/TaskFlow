import '../setup.js';
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { parseCloudinaryUrl } from '../../src/lib/cloudinaryUrl.js';
import { deleteImages, getUsage, isOwnPublicId, listImages, publicIdFromUrl, setCloudinaryFetch, signParams, signedUpload, uploadMode } from '../../src/services/cloudinary.js';

const reply = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const res = (id, created, bytes = 100) => ({ public_id: id, secure_url: `https://res.cloudinary.com/taskflow-test/image/upload/v1/${id}.jpg`, format: 'jpg', bytes, width: 10, height: 10, created_at: created });

afterEach(() => setCloudinaryFetch(null));

describe('publicIdFromUrl', () => {
  it('bỏ phần phiên bản, biến đổi và đuôi file', () => {
    assert.equal(publicIdFromUrl('https://res.cloudinary.com/demo/image/upload/v1712/taskflow/tasks/abc.jpg'), 'taskflow/tasks/abc');
    assert.equal(publicIdFromUrl('https://res.cloudinary.com/demo/image/upload/c_fill,w_200,f_auto/v9/taskflow/avatars/x1.webp'), 'taskflow/avatars/x1');
    assert.equal(publicIdFromUrl('https://res.cloudinary.com/demo/image/upload/c_fill,w_200/taskflow/a.png'), 'taskflow/a');
    assert.equal(publicIdFromUrl('https://evil.com/image/upload/v1/taskflow/a.jpg'), null);
    assert.equal(publicIdFromUrl('data:image/png;base64,xx'), null);
  });

  it('chỉ nhận ảnh trong thư mục taskflow/', () => {
    assert.equal(isOwnPublicId('taskflow/tasks/a'), true);
    assert.equal(isOwnPublicId('other/a'), false);
    assert.equal(isOwnPublicId('taskflow/../other/a'), false);
    assert.equal(isOwnPublicId(42), false);
  });
});

describe('Cloudinary Admin API', () => {
  it('lấy hết các trang, bỏ ảnh ngoài thư mục, mới nhất trước, gửi khoá dạng Basic', async () => {
    const calls = [];
    setCloudinaryFetch(async (url, opts) => {
      calls.push({ url, opts });
      const u = new URL(url);
      if (!u.searchParams.get('next_cursor')) return reply(200, { resources: [res('taskflow/tasks/a', '2026-01-01T00:00:00Z'), res('other/z', '2026-05-01T00:00:00Z')], next_cursor: 'c2' });
      return reply(200, { resources: [res('taskflow/avatars/b', '2026-03-01T00:00:00Z')] });
    });
    const { images } = await listImages({ refresh: true });
    assert.deepEqual(images.map((i) => i.publicId), ['taskflow/avatars/b', 'taskflow/tasks/a']);
    assert.deepEqual(images.map((i) => i.folder), ['avatars', 'tasks']);
    assert.equal(calls.length, 2);
    assert.match(calls[0].url, /^https:\/\/api\.cloudinary\.com\/v1_1\/taskflow-test\/resources\/image\/upload\?prefix=taskflow%2F/);
    assert.equal(calls[0].opts.headers.Authorization, `Basic ${Buffer.from('test-key:test-secret').toString('base64')}`);
    // lần sau dùng bộ nhớ tạm
    await listImages();
    assert.equal(calls.length, 2);
  });

  it('báo lỗi dễ hiểu khi sai khoá hoặc gọi quá nhiều', async () => {
    setCloudinaryFetch(async () => reply(401, { error: { message: 'Invalid api_key' } }));
    await assert.rejects(listImages({ refresh: true }), (e) => e.status === 502 && /CLOUDINARY_URL/.test(e.message));
    setCloudinaryFetch(async () => reply(420, {}));
    await assert.rejects(listImages({ refresh: true }), (e) => e.status === 429);
    setCloudinaryFetch(async () => {
      throw new Error('offline');
    });
    await assert.rejects(listImages({ refresh: true }), (e) => e.status === 502);
    assert.equal(await getUsage(), null);
  });

  it('xoá theo lô 100 ảnh và không bao giờ xoá ảnh ngoài thư mục', async () => {
    const batches = [];
    setCloudinaryFetch(async (url, opts) => {
      assert.equal(opts.method, 'DELETE');
      const ids = new URL(url).searchParams.getAll('public_ids[]');
      batches.push(ids);
      return reply(200, { deleted: Object.fromEntries(ids.map((id) => [id, id.endsWith('-0') ? 'not_found' : 'deleted'])) });
    });
    const ids = Array.from({ length: 150 }, (_, i) => `taskflow/tasks/img-${i}`);
    const out = await deleteImages([...ids, 'other/keep', 'taskflow/tasks/img-1']);
    assert.deepEqual(batches.map((b) => b.length), [100, 50]);
    assert.ok(!batches.flat().includes('other/keep'));
    assert.equal(out.deleted.length, 149);
    assert.deepEqual(out.notFound, ['taskflow/tasks/img-0']);
  });

  it('đọc dung lượng đã dùng', async () => {
    setCloudinaryFetch(async () => reply(200, { plan: 'Free', storage: { usage: 2048, credits_usage: 0.1 }, credits: { usage: 1.5, limit: 25, used_percent: 6 }, resources: 12 }));
    const u = await getUsage();
    assert.equal(u.plan, 'Free');
    assert.equal(u.storage.usage, 2048);
    assert.equal(u.credits.usedPercent, 6);
    assert.equal(u.resources, 12);
  });
});

describe('CLOUDINARY_URL và tải ảnh có chữ ký', () => {
  it('đọc được chuỗi chép từ trang API Keys', () => {
    assert.deepEqual(parseCloudinaryUrl('cloudinary://123456789012345:AbC-dEf_GhI@dxyz123ab'), {
      cloudName: 'dxyz123ab',
      apiKey: '123456789012345',
      apiSecret: 'AbC-dEf_GhI',
    });
    // Lỡ dán cả tên biến, dấu nháy hay dấu / cuối vẫn được
    assert.equal(parseCloudinaryUrl('CLOUDINARY_URL=cloudinary://1:s@demo').cloudName, 'demo');
    assert.equal(parseCloudinaryUrl(' "cloudinary://1:s@demo/" ').apiSecret, 's');
  });

  it('báo sai dạng khi còn chữ mẫu hoặc không phải cloudinary://', () => {
    assert.deepEqual(parseCloudinaryUrl(''), {});
    assert.deepEqual(parseCloudinaryUrl(undefined), {});
    assert.equal(parseCloudinaryUrl('cloudinary://<your_api_key>:<your_api_secret>@demo').invalid, true);
    assert.equal(parseCloudinaryUrl('https://api.cloudinary.com').invalid, true);
    assert.equal(parseCloudinaryUrl('cloudinary://chi-co-key@demo').invalid, true);
  });

  it('chỉ có CLOUDINARY_URL là bật tải ảnh có chữ ký', () => {
    assert.equal(uploadMode(), 'signed');
  });

  it('chữ ký giống cách Cloudinary tính (ví dụ trong tài liệu Cloudinary)', () => {
    const params = { timestamp: 1315060510, public_id: 'sample_image', eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop' };
    assert.equal(signParams(params, 'abcd'), 'bfd09f95f331f558cbd1320e67aa8d488770583e');
  });

  it('chữ ký gắn chặt thư mục taskflow/<loại> và loại file', () => {
    const up = signedUpload('avatars');
    assert.equal(up.cloudName, 'taskflow-test');
    assert.equal(up.apiKey, 'test-key');
    assert.equal(up.folder, 'taskflow/avatars');
    assert.match(up.allowed_formats, /^jpg,/);
    assert.ok(Math.abs(up.timestamp - Date.now() / 1000) < 5);
    const { folder, timestamp, allowed_formats: allowed } = up;
    assert.equal(up.signature, signParams({ folder, timestamp, allowed_formats: allowed }, 'test-secret'));
    assert.notEqual(up.signature, signParams({ folder: 'khac', timestamp, allowed_formats: allowed }, 'test-secret'));
    assert.ok(!JSON.stringify(up).includes('test-secret'));
  });
});

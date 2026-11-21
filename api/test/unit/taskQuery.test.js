import '../setup.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildListPipeline, normalizeTags, pickTaskFields } from '../../src/controllers/taskQuery.js';
import { projectStats } from '../../src/lib/stats.js';

describe('buildListPipeline', () => {
  const projectIds = ['p1', 'p2'];

  it('chỉ lấy công việc trong dự án được phép xem', () => {
    const [{ $match }] = buildListPipeline({}, { projectIds });
    assert.deepEqual($match.project, { $in: projectIds });
    assert.equal($match.owner, undefined);
  });

  it('hỏi dự án của người khác thì trả về rỗng', () => {
    const [{ $match }] = buildListPipeline({ project: 'p9' }, { projectIds });
    assert.deepEqual($match.project, { $in: [] });
  });

  it('lọc theo dự án được phép, trạng thái, ưu tiên, nhãn', () => {
    const [{ $match }] = buildListPipeline({ project: 'p2', status: 'open', priority: 'high,urgent,bogus', tag: 'a.b' }, { projectIds });
    assert.equal($match.project, 'p2');
    assert.deepEqual($match.status, { $ne: 'done' });
    assert.deepEqual($match.priority, { $in: ['high', 'urgent'] });
    assert.equal($match.tags.$regex, '^a\\.b$');
  });

  it('lọc hạn chót hôm nay theo múi giờ người dùng', () => {
    const now = new Date('2026-03-10T20:00:00Z'); // 3h sáng 11/3 giờ VN
    const [{ $match }] = buildListPipeline({ due: 'today' }, { projectIds, now, tzOffset: -420 });
    assert.equal($match.deadline.$gte.toISOString(), '2026-03-10T17:00:00.000Z');
    assert.equal($match.deadline.$lt.toISOString(), '2026-03-11T17:00:00.000Z');
  });
});

describe('pickTaskFields', () => {
  it('bỏ trường không được sửa và chuẩn hoá dữ liệu', () => {
    const data = pickTaskFields({ title: 'A', owner: 'hacker', pomodoros: 99, deadline: '2026-03-10T10:00:00Z', tags: ['#x', 'X'], repeat: 'weekly' });
    assert.deepEqual(Object.keys(data).sort(), ['deadline', 'repeat', 'repeatSpawned', 'tags', 'title']);
    assert.equal(data.repeatSpawned, false);
    assert.deepEqual(data.tags, ['x']);
  });

  it('báo lỗi khi kiểu lặp lại hoặc hạn chót sai', () => {
    assert.throws(() => pickTaskFields({ repeat: 'hourly' }), { status: 400 });
    assert.throws(() => pickTaskFields({ deadline: 'không phải ngày' }), { status: 400 });
    assert.throws(() => normalizeTags('x'), { status: 400 });
  });
});

describe('projectStats', () => {
  it('đếm việc quá hạn, sắp đến hạn và tiến độ', () => {
    const now = new Date('2026-03-10T00:00:00Z');
    const stats = projectStats(
      [
        { status: 'done' },
        { status: 'todo', deadline: new Date('2026-03-09T00:00:00Z') },
        { status: 'doing', deadline: new Date('2026-03-12T00:00:00Z') },
        { status: 'todo' },
      ],
      now
    );
    assert.deepEqual(stats, { total: 4, open: 3, done: 1, doing: 1, overdue: 1, dueSoon: 1, progress: 25 });
  });
});

import '../setup.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { IMPORT_LIMITS, buildExport, parseImport, tasksToCsv } from '../../src/lib/portable.js';

const projects = [
  { _id: 'p1', name: 'Đồ án', description: 'Báo cáo', color: 'blue', archived: false, createdAt: new Date('2026-01-01T00:00:00Z') },
  { _id: 'p2', name: 'Cá nhân', color: 'rose', archived: true, createdAt: new Date('2026-01-02T00:00:00Z') },
];
const tasks = [
  { project: 'p1', title: 'Viết chương 1', status: 'done', priority: 'high', order: 0, completedAt: new Date('2026-01-05T00:00:00Z'), checklist: [{ text: 'a', done: true }, { text: 'b', done: false }], tags: ['báo cáo'] },
  { project: 'p1', title: '=HYPERLINK("http://x")', status: 'todo', priority: 'low', order: 1, description: 'Có "ngoặc kép", dấu phẩy\nvà xuống dòng', repeat: 'weekly' },
  { project: 'p1', title: 'Làm slide', status: 'todo', priority: 'medium', order: 0 },
];

describe('buildExport', () => {
  it('gom công việc vào từng dự án, sắp theo cột rồi thứ tự', () => {
    const data = buildExport({ user: { name: 'An', email: 'an@example.com' }, projects, tasks, now: new Date('2026-02-01T00:00:00Z') });
    assert.equal(data.app, 'TaskFlow');
    assert.equal(data.version, 1);
    assert.equal(data.exportedAt, '2026-02-01T00:00:00.000Z');
    assert.equal(data.projects.length, 2);
    assert.deepEqual(data.projects[0].tasks.map((t) => t.title), ['Làm slide', '=HYPERLINK("http://x")', 'Viết chương 1']);
    assert.equal(data.projects[0].tasks[1].repeat, 'weekly');
    assert.equal(data.projects[1].tasks.length, 0);
    assert.equal(data.projects[1].archived, true);
  });
});

describe('tasksToCsv', () => {
  const csv = tasksToCsv(projects, tasks, 'vi');

  it('có BOM để Excel đọc đúng tiếng Việt và xuống dòng kiểu CRLF', () => {
    assert.ok(csv.startsWith('﻿Dự án,Công việc,'));
    assert.equal(csv.split('\r\n').length, tasks.length + 2);
  });

  it('chặn công thức Excel (CSV injection) và bọc ô có ký tự đặc biệt', () => {
    assert.match(csv, /,"'=HYPERLINK\(""http:\/\/x""\)",/);
    assert.match(csv, /"Có ""ngoặc kép"", dấu phẩy\nvà xuống dòng"/);
  });

  it('dịch trạng thái, ưu tiên, checklist', () => {
    assert.match(csv, /Đồ án,Viết chương 1,Đã xong,Cao,/);
    assert.match(csv, /,1\/2,/);
    assert.match(csv, /Hằng tuần/);
  });

  it('có bản tiếng Anh', () => {
    const en = tasksToCsv(projects, tasks, 'en');
    assert.ok(en.startsWith('﻿Project,Task,Status'));
    assert.match(en, /Viết chương 1,Done,High/);
  });
});

describe('parseImport', () => {
  const exported = buildExport({ user: { name: 'An', email: 'an@example.com' }, projects, tasks });

  it('đọc lại được file vừa xuất', () => {
    const { projects: parsed, taskCount } = parseImport(JSON.parse(JSON.stringify(exported)));
    assert.equal(parsed.length, 2);
    assert.equal(taskCount, 3);
    const done = parsed[0].tasks.find((t) => t.status === 'done');
    assert.equal(done.completedAt.toISOString(), '2026-01-05T00:00:00.000Z');
  });

  it('từ chối file không phải của TaskFlow', () => {
    assert.throws(() => parseImport({ projects: [] }), { status: 400 });
    assert.throws(() => parseImport(null), { status: 400 });
    assert.throws(() => parseImport({ app: 'TaskFlow', projects: 'x' }), { status: 400 });
  });

  it('làm sạch giá trị lạ và bỏ công việc không có tên', () => {
    const { projects: parsed } = parseImport({
      app: 'TaskFlow',
      projects: [
        {
          name: '  Dự án  ',
          color: 'not-a-color',
          tasks: [
            { title: 'A', status: 'weird', priority: 'x', deadline: 'not a date', tags: ['#x', 'X', ' y '], checklist: [{ text: '' }, { text: 'ok', done: 1 }], repeat: 'hourly' },
            { title: '   ' },
          ],
        },
      ],
    });
    const [p] = parsed;
    assert.equal(p.name, 'Dự án');
    assert.equal(p.color, 'blue');
    assert.equal(p.tasks.length, 1);
    assert.deepEqual(
      { status: p.tasks[0].status, priority: p.tasks[0].priority, deadline: p.tasks[0].deadline, repeat: p.tasks[0].repeat },
      { status: 'todo', priority: 'medium', deadline: null, repeat: 'none' }
    );
    assert.deepEqual(p.tasks[0].tags, ['x', 'y']);
    assert.deepEqual(p.tasks[0].checklist, [{ text: 'ok', done: true }]);
  });

  it('giới hạn số dự án và số công việc mỗi lần nhập', () => {
    const many = Array.from({ length: IMPORT_LIMITS.projects + 1 }, (_, i) => ({ name: `P${i}` }));
    assert.throws(() => parseImport({ app: 'TaskFlow', projects: many }), /tối đa/);
    const bigTasks = Array.from({ length: IMPORT_LIMITS.tasks + 1 }, (_, i) => ({ title: `T${i}` }));
    assert.throws(() => parseImport({ app: 'TaskFlow', projects: [{ name: 'P', tasks: bigTasks }] }), /tối đa/);
  });

  it('báo lỗi khi dự án thiếu tên', () => {
    assert.throws(() => parseImport({ app: 'TaskFlow', projects: [{ name: '' }] }), /thứ 1/);
  });
});

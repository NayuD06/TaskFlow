import '../setup.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { nextOccurrence } from '../../src/lib/recurrence.js';

const VN = -420; // giờ Việt Nam
const iso = (d) => d.toISOString();

describe('nextOccurrence', () => {
  const now = new Date('2026-03-10T02:00:00Z'); // 9h sáng thứ Ba 10/3 giờ VN

  it('không lặp thì trả về null', () => {
    assert.equal(nextOccurrence(now, 'none', { now }), null);
    assert.equal(nextOccurrence(now, 'yearly', { now }), null);
  });

  it('hằng ngày cộng thêm 1 ngày, giữ nguyên giờ', () => {
    const base = new Date('2026-03-10T10:00:00Z');
    assert.equal(iso(nextOccurrence(base, 'daily', { now, tzOffset: VN })), '2026-03-11T10:00:00.000Z');
  });

  it('hằng tuần cộng 7 ngày', () => {
    const base = new Date('2026-03-10T10:00:00Z');
    assert.equal(iso(nextOccurrence(base, 'weekly', { now, tzOffset: VN })), '2026-03-17T10:00:00.000Z');
  });

  it('ngày làm việc: thứ Sáu chuyển sang thứ Hai theo giờ địa phương', () => {
    // 23h thứ Sáu 13/3 giờ VN = 16h UTC thứ Sáu
    const friday = new Date('2026-03-13T16:00:00Z');
    const next = nextOccurrence(friday, 'weekdays', { now, tzOffset: VN });
    assert.equal(iso(next), '2026-03-16T16:00:00.000Z'); // 23h thứ Hai 16/3 giờ VN
  });

  it('ngày làm việc: dùng múi giờ người dùng chứ không phải UTC', () => {
    // 6h sáng thứ Hai 16/3 giờ VN là 23h Chủ nhật 15/3 theo UTC
    const mondayMorningVN = new Date('2026-03-15T23:00:00Z');
    const next = nextOccurrence(mondayMorningVN, 'weekdays', { now, tzOffset: VN });
    assert.equal(iso(next), '2026-03-16T23:00:00.000Z'); // 6h sáng thứ Ba
  });

  it('hằng tháng giữ ngày gốc, 31/1 -> 28/2 (không trôi về 28 ở các tháng sau)', () => {
    const jan31 = new Date('2026-01-31T03:00:00Z');
    const early = new Date('2026-01-01T00:00:00Z');
    assert.equal(iso(nextOccurrence(jan31, 'monthly', { now: early })), '2026-02-28T03:00:00.000Z');
  });

  it('hoàn thành trễ thì bỏ qua các lần đã qua', () => {
    const old = new Date('2026-03-01T10:00:00Z');
    const next = nextOccurrence(old, 'weekly', { now, tzOffset: VN });
    assert.equal(iso(next), '2026-03-15T10:00:00.000Z');
    assert.ok(next > now);
  });

  it('hằng tháng trễ nhiều tháng vẫn giữ ngày gốc', () => {
    const base = new Date('2025-10-31T03:00:00Z');
    const next = nextOccurrence(base, 'monthly', { now });
    assert.equal(iso(next), '2026-03-31T03:00:00.000Z');
  });

  it('không có hạn chót thì tính từ bây giờ', () => {
    const next = nextOccurrence(null, 'daily', { now });
    assert.equal(iso(next), '2026-03-11T02:00:00.000Z');
  });
});

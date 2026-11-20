// Tính số liệu cho dự án và dashboard từ danh sách task (thuần JS, không đụng DB).
// Ứng dụng cá nhân nên lượng task nhỏ, tính trong bộ nhớ đơn giản và dễ test hơn aggregate.
import { dayIndex, dayStart, weekdayMon } from './time.js';

const ms = (d) => (d ? new Date(d).getTime() : null);
const isOpen = (t) => t.status !== 'done';
const idOf = (v) => String(v?._id ?? v);

export function projectStats(tasks, now = new Date()) {
  const nowMs = now.getTime();
  const weekAhead = nowMs + 7 * 24 * 60 * 60 * 1000;
  const stats = { total: 0, open: 0, done: 0, doing: 0, overdue: 0, dueSoon: 0, progress: 0 };
  for (const t of tasks) {
    stats.total += 1;
    if (t.status === 'done') stats.done += 1;
    else {
      stats.open += 1;
      if (t.status === 'doing') stats.doing += 1;
      const d = ms(t.deadline);
      if (d !== null && d < nowMs) stats.overdue += 1;
      else if (d !== null && d <= weekAhead) stats.dueSoon += 1;
    }
  }
  stats.progress = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
  return stats;
}

/** Gắn stats vào từng dự án. */
export function withProjectStats(projects, tasks, now = new Date()) {
  const byProject = new Map();
  for (const t of tasks) {
    const key = idOf(t.project);
    if (!byProject.has(key)) byProject.set(key, []);
    byProject.get(key).push(t);
  }
  return projects.map((p) => ({ ...p, stats: projectStats(byProject.get(idOf(p._id)) || [], now) }));
}

function slim(task, projectsById) {
  const p = projectsById.get(idOf(task.project));
  return {
    _id: task._id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    deadline: task.deadline,
    completedAt: task.completedAt,
    checklist: task.checklist || [],
    description: task.description || '',
    project: p ? { _id: p._id, name: p.name, color: p.color } : null,
  };
}

/**
 * Số liệu dashboard.
 *  - week: việc có hạn trong tuần này (thứ Hai -> Chủ nhật) và bao nhiêu việc đã xong
 *  - stats: 4 chỉ số kèm chuỗi 7 ngày cho sparkline
 *  - throughput: số việc hoàn thành mỗi ngày trong 28 ngày gần nhất (cũ -> mới)
 *  - focus: việc quá hạn / hôm nay / 7 ngày tới
 */
export function computeDashboard({ tasks, projects, now = new Date(), tzOffset = 0 }) {
  const nowMs = now.getTime();
  const today = dayIndex(now, tzOffset);
  const projectsById = new Map(projects.map((p) => [idOf(p._id), p]));
  const activeIds = new Set(projects.filter((p) => !p.archived).map((p) => idOf(p._id)));
  const live = tasks.filter((t) => activeIds.has(idOf(t.project)));

  // Tuần hiện tại
  const weekStartIdx = today - weekdayMon(today);
  const weekStart = ms(dayStart(weekStartIdx, tzOffset));
  const weekEnd = ms(dayStart(weekStartIdx + 7, tzOffset));
  const dueThisWeek = live.filter((t) => {
    const d = ms(t.deadline);
    return d !== null && d >= weekStart && d < weekEnd;
  });
  const completedThisWeek = live.filter((t) => {
    const c = ms(t.completedAt);
    return c !== null && c >= weekStart && c < weekEnd;
  }).length;
  const weekDone = dueThisWeek.filter((t) => t.status === 'done').length;

  // Chỉ số hiện tại
  const open = live.filter(isOpen);
  const dueToday = open.filter((t) => t.deadline && dayIndex(t.deadline, tzOffset) === today && ms(t.deadline) >= nowMs);
  const overdue = open.filter((t) => t.deadline && ms(t.deadline) < nowMs);
  const done7 = live.filter((t) => {
    const c = ms(t.completedAt);
    return c !== null && dayIndex(c, tzOffset) > today - 7;
  });

  // Chuỗi 7 ngày (cũ -> mới), giá trị tại cuối mỗi ngày
  const spark = { open: [], dueToday: [], overdue: [], done: [] };
  for (let i = 6; i >= 0; i -= 1) {
    const idx = today - i;
    const end = i === 0 ? nowMs : ms(dayStart(idx + 1, tzOffset));
    let openN = 0;
    let dueN = 0;
    let overdueN = 0;
    let doneN = 0;
    for (const t of live) {
      const created = ms(t.createdAt) ?? 0;
      const completed = ms(t.completedAt);
      const d = ms(t.deadline);
      if (completed !== null && dayIndex(completed, tzOffset) === idx) doneN += 1;
      if (d !== null && dayIndex(d, tzOffset) === idx) dueN += 1;
      if (created > end) continue;
      const openAtEnd = completed === null || completed > end;
      if (openAtEnd) {
        openN += 1;
        if (d !== null && d < end) overdueN += 1;
      }
    }
    spark.open.push(openN);
    spark.dueToday.push(dueN);
    spark.overdue.push(overdueN);
    spark.done.push(doneN);
  }

  // Hoàn thành mỗi ngày trong 28 ngày
  const daily = Array(28).fill(0);
  for (const t of live) {
    const c = ms(t.completedAt);
    if (c === null) continue;
    const offset = today - dayIndex(c, tzOffset);
    if (offset >= 0 && offset < 28) daily[27 - offset] += 1;
  }

  // Phân bố việc đang mở
  const byStatus = { todo: 0, doing: 0, done: 0 };
  const byPriority = { urgent: 0, high: 0, medium: 0, low: 0 };
  for (const t of live) {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    if (isOpen(t)) byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
  }

  const byDeadline = (a, b) => ms(a.deadline) - ms(b.deadline);
  const weekLimit = ms(dayStart(today + 8, tzOffset));
  const upcoming = open
    .filter((t) => {
      const d = ms(t.deadline);
      return d !== null && dayIndex(d, tzOffset) > today && d < weekLimit;
    })
    .sort(byDeadline);

  const activeProjects = withProjectStats(
    projects.filter((p) => !p.archived),
    live,
    now
  )
    .map((p) => ({ _id: p._id, name: p.name, color: p.color, ...p.stats }))
    .sort((a, b) => b.open - a.open);

  return {
    week: {
      total: dueThisWeek.length,
      done: weekDone,
      completed: completedThisWeek,
      progress: dueThisWeek.length ? Math.round((weekDone / dueThisWeek.length) * 100) : 0,
      start: new Date(weekStart),
    },
    stats: {
      open: open.length,
      dueToday: dueToday.length,
      overdue: overdue.length,
      done7: done7.length,
      spark,
    },
    throughput: { daily },
    byStatus,
    byPriority,
    projects: activeProjects,
    focus: {
      overdue: overdue.sort(byDeadline).slice(0, 12).map((t) => slim(t, projectsById)),
      today: dueToday.sort(byDeadline).slice(0, 12).map((t) => slim(t, projectsById)),
      week: upcoming.slice(0, 12).map((t) => slim(t, projectsById)),
    },
  };
}

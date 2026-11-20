// Dữ liệu mẫu. Mọi mốc thời gian tính tương đối theo lúc chạy seed (giờ Việt Nam),
// nên lúc nào cũng có việc quá hạn, việc hôm nay, việc tuần sau và lịch sử hoàn thành 3 tuần.
const DAY = 24 * 60 * 60 * 1000;
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

function at(days, hour = 17, minute = 0, now = Date.now()) {
  const vn = new Date(now + days * DAY + VN_OFFSET_MS);
  vn.setUTCHours(hour, minute, 0, 0);
  return new Date(vn.getTime() - VN_OFFSET_MS);
}

const list = (...items) => items.map(([text, done = false]) => ({ text, done }));

export function buildSeed(now = Date.now()) {
  const t = (days, hour, minute) => at(days, hour, minute, now);

  const projects = [
    {
      key: 'thesis',
      name: 'Đồ án tốt nghiệp',
      description: 'Hệ thống quản lý công việc nhóm: báo cáo, demo và bảo vệ trước hội đồng.',
      color: 'blue',
      createdAt: t(-24, 9),
    },
    {
      key: 'web',
      name: 'Website TaskFlow',
      description: 'Frontend React + Vite, API Express + MongoDB, deploy Vercel và Render.',
      color: 'violet',
      createdAt: t(-21, 10),
    },
    {
      key: 'english',
      name: 'Luyện thi IELTS',
      description: 'Mục tiêu 6.5 trước tháng 3. Mỗi ngày một kỹ năng.',
      color: 'teal',
      createdAt: t(-19, 20),
    },
    {
      key: 'life',
      name: 'Việc cá nhân',
      description: 'Giấy tờ, mua sắm, gia đình và những việc lặt vặt.',
      color: 'rose',
      createdAt: t(-16, 21),
    },
    {
      key: 'health',
      name: 'Sức khoẻ',
      description: 'Chạy bộ, gym và ngủ đủ giấc.',
      color: 'amber',
      createdAt: t(-14, 7),
    },
  ];

  const tasks = [
    // Đồ án tốt nghiệp
    { projectKey: 'thesis', title: 'Viết chương 3: Thiết kế hệ thống', description: 'Sơ đồ ERD, use case, sequence cho luồng giao việc.', status: 'doing', priority: 'urgent', deadline: t(1, 17), createdAt: t(-20, 9), checklist: list(['Sơ đồ ERD', true], ['Use case tổng quát', true], ['Sequence: giao việc'], ['Sequence: thông báo']) },
    { projectKey: 'thesis', title: 'Gửi bản nháp cho thầy hướng dẫn', description: 'Gửi qua email kèm file PDF, hỏi lịch gặp tuần sau.', status: 'todo', priority: 'high', deadline: t(-1, 22), createdAt: t(-10, 14) },
    { projectKey: 'thesis', title: 'Chuẩn bị slide bảo vệ', description: '15 slide, tập trung vào demo và kết quả.', status: 'todo', priority: 'high', deadline: t(9, 9), createdAt: t(-6, 20), checklist: list(['Dàn ý'], ['Thiết kế template'], ['Chèn video demo']) },
    { projectKey: 'thesis', title: 'Quay video demo 3 phút', status: 'todo', priority: 'medium', deadline: t(6, 21), createdAt: t(-5, 11) },
    { projectKey: 'thesis', title: 'Khảo sát 30 người dùng thử', description: 'Google Form, tổng hợp kết quả vào chương 5.', status: 'doing', priority: 'medium', deadline: t(3, 18), createdAt: t(-9, 15) },
    { projectKey: 'thesis', title: 'Hoàn thành chương 2: Cơ sở lý thuyết', status: 'done', priority: 'high', deadline: t(-8, 17), createdAt: t(-23, 9), completedAt: t(-9, 22) },
    { projectKey: 'thesis', title: 'Chốt đề cương với hội đồng', status: 'done', priority: 'urgent', deadline: t(-18, 10), createdAt: t(-24, 9), completedAt: t(-19, 16) },
    { projectKey: 'thesis', title: 'Đọc 5 bài báo liên quan', status: 'done', priority: 'low', createdAt: t(-22, 13), completedAt: t(-15, 21) },
    { projectKey: 'thesis', title: 'Viết chương 1: Tổng quan', status: 'done', priority: 'medium', deadline: t(-12, 17), createdAt: t(-22, 10), completedAt: t(-13, 23) },

    // Website TaskFlow
    { projectKey: 'web', title: 'Thiết kế lại giao diện dashboard', description: 'Tông đen + xanh dương, có chế độ sáng.', status: 'doing', priority: 'high', deadline: t(0, 20), createdAt: t(-4, 9), checklist: list(['Khung sidebar + header', true], ['Thẻ số liệu', true], ['Biểu đồ hoàn thành'], ['Responsive mobile']) },
    { projectKey: 'web', title: 'Kéo thả task giữa các cột', description: 'Dùng dnd-kit, hỗ trợ cả bàn phím.', status: 'todo', priority: 'high', deadline: t(2, 17), createdAt: t(-3, 10) },
    { projectKey: 'web', title: 'Fix lỗi CORS trên Render', description: 'Preview của Vercel bị chặn, cần thêm wildcard.', status: 'todo', priority: 'urgent', deadline: t(-2, 12), createdAt: t(-5, 16) },
    { projectKey: 'web', title: 'Viết unit test cho API', status: 'todo', priority: 'medium', deadline: t(5, 17), createdAt: t(-7, 10) },
    { projectKey: 'web', title: 'Thêm chế độ lịch tháng', status: 'todo', priority: 'low', deadline: t(12, 17), createdAt: t(-2, 21) },
    { projectKey: 'web', title: 'Tối ưu Lighthouse trên mobile', status: 'todo', priority: 'low', createdAt: t(-1, 22) },
    { projectKey: 'web', title: 'Dựng API dự án và thống kê', status: 'done', priority: 'high', deadline: t(-3, 17), createdAt: t(-12, 9), completedAt: t(-3, 15) },
    { projectKey: 'web', title: 'Tạo cluster MongoDB Atlas', status: 'done', priority: 'medium', createdAt: t(-20, 10), completedAt: t(-18, 11) },
    { projectKey: 'web', title: 'Khởi tạo repo và cấu trúc web/ api/', status: 'done', priority: 'medium', createdAt: t(-21, 10), completedAt: t(-20, 22) },
    { projectKey: 'web', title: 'Seed dữ liệu mẫu', status: 'done', priority: 'low', createdAt: t(-6, 9), completedAt: t(-1, 10) },
    { projectKey: 'web', title: 'Deploy bản thử lên Vercel', status: 'done', priority: 'medium', deadline: t(-5, 17), createdAt: t(-11, 9), completedAt: t(-6, 20) },

    // IELTS
    { projectKey: 'english', title: 'Làm đề Reading Cambridge 18 - Test 2', status: 'todo', priority: 'medium', deadline: t(0, 21, 30), createdAt: t(-2, 8) },
    { projectKey: 'english', title: 'Viết Task 2: chủ đề môi trường', description: '250 từ, nhờ bạn chấm theo 4 tiêu chí.', status: 'doing', priority: 'high', deadline: t(1, 22), createdAt: t(-3, 20) },
    { projectKey: 'english', title: 'Học 30 từ vựng chủ đề Technology', status: 'todo', priority: 'low', deadline: t(4, 21), createdAt: t(-1, 7) },
    { projectKey: 'english', title: 'Đăng ký thi thử tại trung tâm', status: 'todo', priority: 'medium', deadline: t(-1, 17), createdAt: t(-8, 12) },
    { projectKey: 'english', title: 'Luyện Speaking Part 2 với bạn', status: 'done', priority: 'medium', createdAt: t(-6, 19), completedAt: t(-2, 21) },
    { projectKey: 'english', title: 'Làm đề Listening Test 1', status: 'done', priority: 'medium', deadline: t(-4, 21), createdAt: t(-9, 19), completedAt: t(-4, 21) },
    { projectKey: 'english', title: 'Ôn ngữ pháp câu điều kiện', status: 'done', priority: 'low', createdAt: t(-17, 20), completedAt: t(-16, 22) },
    { projectKey: 'english', title: 'Viết Task 1: biểu đồ đường', status: 'done', priority: 'medium', createdAt: t(-12, 20), completedAt: t(-11, 22) },

    // Việc cá nhân
    { projectKey: 'life', title: 'Mua quà sinh nhật cho mẹ', description: 'Mẹ thích khăn lụa hoặc một chậu lan.', status: 'todo', priority: 'high', deadline: t(3, 12), createdAt: t(-4, 21) },
    { projectKey: 'life', title: 'Gia hạn bảo hiểm xe máy', status: 'todo', priority: 'medium', deadline: t(0, 17), createdAt: t(-6, 8) },
    { projectKey: 'life', title: 'Dọn phòng và sắp xếp lại dây cáp', status: 'todo', priority: 'low', createdAt: t(-3, 22) },
    { projectKey: 'life', title: 'Đóng tiền internet tháng này', status: 'done', priority: 'medium', deadline: t(-2, 17), createdAt: t(-5, 9), completedAt: t(-2, 9) },
    { projectKey: 'life', title: 'Làm lại căn cước công dân', status: 'done', priority: 'high', createdAt: t(-15, 8), completedAt: t(-10, 10) },

    // Sức khoẻ
    { projectKey: 'health', title: 'Chạy 5km công viên Gia Định', status: 'todo', priority: 'medium', deadline: t(1, 6), createdAt: t(-1, 20) },
    { projectKey: 'health', title: 'Đặt lịch khám sức khoẻ định kỳ', status: 'todo', priority: 'medium', deadline: t(7, 9), createdAt: t(-5, 12) },
    { projectKey: 'health', title: 'Tập gym: lưng và vai', status: 'done', priority: 'low', createdAt: t(-2, 17), completedAt: t(0, 7) },
    { projectKey: 'health', title: 'Ngủ trước 23h cả tuần', status: 'done', priority: 'low', createdAt: t(-8, 22), completedAt: t(-1, 23) },
    { projectKey: 'health', title: 'Chạy 3km buổi sáng', status: 'done', priority: 'low', createdAt: t(-6, 20), completedAt: t(-5, 6) },
    { projectKey: 'health', title: 'Mua giày chạy bộ mới', status: 'done', priority: 'medium', createdAt: t(-14, 7), completedAt: t(-12, 19) },
  ];

  // Thứ tự trong cột theo thứ tự khai báo
  const counters = {};
  for (const task of tasks) {
    const key = `${task.projectKey}:${task.status}`;
    counters[key] = (counters[key] ?? -1) + 1;
    task.order = counters[key];
    // Không để mốc hoàn thành rơi vào tương lai nếu seed chạy lúc sáng sớm
    task.completedAt = task.completedAt ? new Date(Math.min(task.completedAt.getTime(), now - 60 * 1000)) : null;
    task.deadline = task.deadline ?? null;
  }

  return { projects, tasks };
}

/** Sinh lịch sử hoạt động từ các task đã có _id. */
export function buildSeedActivity(tasks, projectsById) {
  const items = [];
  for (const task of tasks) {
    const project = projectsById.get(String(task.project));
    const base = {
      task: task._id,
      taskTitle: task.title,
      project: project?._id ?? null,
      projectName: project?.name ?? '',
      projectColor: project?.color ?? 'blue',
    };
    items.push({ ...base, type: 'task_created', createdAt: task.createdAt });
    if (task.status === 'doing') {
      const movedAt = new Date((new Date(task.createdAt).getTime() + Date.now()) / 2);
      items.push({ ...base, type: 'task_moved', from: 'todo', to: 'doing', createdAt: movedAt });
    }
    if (task.status === 'done' && task.completedAt) {
      items.push({ ...base, type: 'task_completed', from: 'doing', to: 'done', createdAt: task.completedAt });
    }
  }
  for (const project of projectsById.values()) {
    items.push({
      type: 'project_created',
      project: project._id,
      projectName: project.name,
      projectColor: project.color,
      createdAt: project.createdAt,
    });
  }
  return items;
}

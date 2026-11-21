// Tài liệu API theo chuẩn OpenAPI 3.1. Xem giao diện tại /api/docs, file JSON tại /api/docs.json.
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema) => ({ content: { 'application/json': { schema } } });
const ok = (schema, description = 'Thành công') => ({ description, ...json({ type: 'object', properties: { data: schema } }) });
const body = (schema, required = true) => ({ required, ...json(schema) });
const idParam = (name = 'id', description = 'ObjectId') => ({ name, in: 'path', required: true, schema: { type: 'string' }, description });
const tz = { name: 'tzOffset', in: 'query', schema: { type: 'integer' }, description: 'Kết quả của new Date().getTimezoneOffset() trên trình duyệt, ví dụ -420 cho giờ Việt Nam' };
const err = (description) => ({ description, ...json(ref('Error')) });
const E = {
  400: err('Dữ liệu không hợp lệ'),
  401: err('Chưa đăng nhập hoặc token hết hạn'),
  403: err('Không có quyền'),
  404: err('Không tìm thấy'),
};
const secured = { security: [{ bearerAuth: [] }] };
const op = (tag, summary, { responses = {}, ...rest } = {}) => ({ tags: [tag], summary, ...rest, responses: { ...responses } });

const s = (props, required = []) => ({ type: 'object', properties: props, ...(required.length ? { required } : {}) });
const str = { type: 'string' };
const int = { type: 'integer' };
const bool = { type: 'boolean' };
const date = { type: 'string', format: 'date-time' };
const nullable = (schema) => ({ anyOf: [schema, { type: 'null' }] });
const arr = (items) => ({ type: 'array', items });

const schemas = {
  Error: s({ error: s({ message: str, fields: { type: 'object', additionalProperties: str } }) }),
  User: s({
    _id: str,
    name: str,
    email: { type: 'string', format: 'email' },
    avatar: str,
    avatarColor: str,
    accentColor: str,
    isDemo: bool,
    hasPassword: { type: 'boolean', description: 'false nếu tài khoản tạo bằng Google và chưa đặt mật khẩu' },
    createdAt: date,
  }),
  Session: s({ user: ref('User'), token: { type: 'string', description: 'JWT, gửi lại trong header Authorization: Bearer <token>' } }),
  Member: s({ _id: str, name: str, avatar: str, avatarColor: str }),
  ProjectStats: s({ total: int, open: int, done: int, doing: int, overdue: int, dueSoon: int, progress: int }),
  Project: s({
    _id: str,
    name: str,
    description: str,
    color: str,
    archived: bool,
    role: { type: 'string', enum: ['owner', 'member'] },
    shared: bool,
    ownerInfo: ref('Member'),
    members: arr(ref('Member')),
    inviteCount: { type: 'integer', description: 'Chỉ chủ dự án thấy' },
    stats: ref('ProjectStats'),
    createdAt: date,
  }),
  ProjectInput: s({ name: { type: 'string', maxLength: 60 }, description: { type: 'string', maxLength: 300 }, color: str, archived: bool }),
  ChecklistItem: s({ _id: str, text: str, done: bool }),
  Attachment: s({ _id: str, url: str, publicId: str, name: str, width: int, height: int, bytes: int, addedBy: str, createdAt: date }),
  Task: s({
    _id: str,
    title: str,
    description: str,
    project: str,
    projectName: str,
    projectColor: str,
    status: { type: 'string', enum: ['todo', 'doing', 'done'] },
    priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
    deadline: nullable(date),
    completedAt: nullable(date),
    order: int,
    tags: arr(str),
    checklist: arr(ref('ChecklistItem')),
    repeat: { type: 'string', enum: ['none', 'daily', 'weekdays', 'weekly', 'monthly'] },
    attachments: arr(ref('Attachment')),
    commentCount: int,
    pomodoros: int,
    focusMinutes: int,
    createdAt: date,
    updatedAt: date,
  }),
  TaskInput: s({
    title: { type: 'string', maxLength: 120 },
    description: { type: 'string', maxLength: 2000 },
    project: str,
    status: { type: 'string', enum: ['todo', 'doing', 'done'] },
    priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
    deadline: nullable(date),
    tags: arr(str),
    checklist: arr(s({ text: str, done: bool })),
    repeat: { type: 'string', enum: ['none', 'daily', 'weekdays', 'weekly', 'monthly'] },
  }),
  TaskResult: s({
    data: ref('Task'),
    nextOccurrence: { ...nullable(s({ _id: str, deadline: date })), description: 'Có khi hoàn thành một việc lặp lại: lần kế tiếp vừa được tạo' },
  }),
  Comment: s({ _id: str, task: str, text: str, author: ref('Member'), mine: bool, createdAt: date }),
  Activity: s({
    _id: str,
    type: { type: 'string', enum: ['task_created', 'task_completed', 'task_reopened', 'task_moved', 'task_deleted', 'project_created', 'task_commented', 'pomodoro_completed', 'member_joined'] },
    taskTitle: str,
    projectName: str,
    projectColor: str,
    actorName: str,
    mine: bool,
    from: nullable(str),
    to: nullable(str),
    createdAt: date,
  }),
};

export function buildOpenApi() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'TaskFlow API',
      version: pkg.version,
      description:
        'REST API của TaskFlow: quản lý dự án, công việc (Kanban), lịch, thống kê, chia sẻ dự án.\n\n' +
        'Đăng nhập bằng `POST /api/auth/login`, lấy `token` rồi bấm **Authorize** và dán token vào để thử các API cần đăng nhập. ' +
        'Tài khoản demo: `demo@taskflow.dev` / `Demo@123456`.',
      contact: { name: 'Duy An', url: 'https://github.com/NayuD06/TaskFlow' },
      license: { name: 'MIT', identifier: 'MIT' },
    },
    servers: [{ url: '/', description: 'Máy chủ hiện tại' }],
    tags: [
      { name: 'Hệ thống' },
      { name: 'Tài khoản' },
      { name: 'Dự án' },
      { name: 'Thành viên' },
      { name: 'Công việc' },
      { name: 'Bình luận, ảnh, Pomodoro' },
      { name: 'Thống kê' },
      { name: 'Xuất, nhập dữ liệu' },
    ],
    components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } }, schemas },
    paths: {
      '/api/health': { get: op('Hệ thống', 'Kiểm tra máy chủ và kết nối database', { responses: { 200: { description: 'Đang chạy' }, 503: { description: 'Mất kết nối database' } } }) },
      '/api/config': {
        get: op('Hệ thống', 'Cấu hình công khai cho web (Google, tải ảnh, email)', {
          responses: { 200: ok(s({ googleClientId: nullable(str), uploads: nullable(s({ provider: str, cloudName: str, uploadPreset: str })), mail: bool })) },
        }),
      },

      '/api/auth/register': {
        post: op('Tài khoản', 'Đăng ký', {
          requestBody: body(s({ name: str, email: str, password: { type: 'string', description: '8 đến 72 ký tự, có chữ và số' } }, ['name', 'email', 'password'])),
          responses: { 201: ok(ref('Session')), 400: E[400], 409: err('Email đã được đăng ký') },
        }),
      },
      '/api/auth/login': {
        post: op('Tài khoản', 'Đăng nhập', {
          requestBody: body(s({ email: str, password: str }, ['email', 'password'])),
          responses: { 200: ok(ref('Session')), 401: err('Sai email hoặc mật khẩu'), 429: err('Thử quá nhiều lần') },
        }),
      },
      '/api/auth/google': {
        post: op('Tài khoản', 'Đăng nhập hoặc đăng ký bằng Google', {
          description: 'credential là ID token mà nút "Sign in with Google" trả về. Cần đặt GOOGLE_CLIENT_ID trên server.',
          requestBody: body(s({ credential: str }, ['credential'])),
          responses: { 200: ok(ref('Session'), 'Đăng nhập'), 201: ok(ref('Session'), 'Tạo tài khoản mới'), 401: err('Token Google không hợp lệ'), 503: err('Server chưa cấu hình Google') },
        }),
      },
      '/api/auth/forgot-password': {
        post: op('Tài khoản', 'Gửi email đặt lại mật khẩu', {
          description: 'Luôn trả về 200 dù email có tồn tại hay không. Liên kết có hạn 30 phút.',
          requestBody: body(s({ email: str }, ['email'])),
          responses: { 200: ok(s({ ok: bool })), 400: E[400] },
        }),
      },
      '/api/auth/reset-password': {
        post: op('Tài khoản', 'Đặt mật khẩu mới bằng liên kết trong email', {
          requestBody: body(s({ token: str, password: str }, ['token', 'password'])),
          responses: { 200: ok(ref('Session')), 400: err('Liên kết hết hạn hoặc mật khẩu không hợp lệ') },
        }),
      },
      '/api/auth/me': {
        get: op('Tài khoản', 'Thông tin người đang đăng nhập', { ...secured, responses: { 200: ok(ref('User')), 401: E[401] } }),
        patch: op('Tài khoản', 'Sửa hồ sơ', {
          ...secured,
          requestBody: body(s({ name: str, avatarColor: str, accentColor: str, avatar: str })),
          responses: { 200: ok(ref('User')), 400: E[400] },
        }),
        delete: op('Tài khoản', 'Xoá tài khoản và toàn bộ dữ liệu', {
          ...secured,
          requestBody: body(s({ password: str, confirm: { type: 'string', description: 'Email của bạn, dùng khi tài khoản chưa có mật khẩu' } })),
          responses: { 200: ok(s({ deletedProjects: int, deletedTasks: int })), 400: E[400] },
        }),
      },
      '/api/auth/change-password': {
        post: op('Tài khoản', 'Đổi mật khẩu (hoặc đặt lần đầu nếu tài khoản tạo bằng Google)', {
          ...secured,
          requestBody: body(s({ currentPassword: str, newPassword: str }, ['newPassword'])),
          responses: { 200: ok(ref('Session')), 400: E[400] },
        }),
      },
      '/api/auth/logout-all': { post: op('Tài khoản', 'Đăng xuất khỏi mọi thiết bị', { ...secured, responses: { 200: ok(s({ ok: bool })) } }) },

      '/api/projects': {
        get: op('Dự án', 'Danh sách dự án của mình và dự án được mời vào', {
          ...secured,
          parameters: [{ name: 'archived', in: 'query', schema: { type: 'string', enum: ['true', 'false', 'all'] } }],
          responses: { 200: ok(arr(ref('Project'))) },
        }),
        post: op('Dự án', 'Tạo dự án', { ...secured, requestBody: body(ref('ProjectInput')), responses: { 201: ok(ref('Project')), 400: E[400] } }),
      },
      '/api/projects/{id}': {
        parameters: [idParam()],
        get: op('Dự án', 'Chi tiết dự án', { ...secured, responses: { 200: ok(ref('Project')), 404: E[404] } }),
        patch: op('Dự án', 'Sửa dự án (chỉ chủ dự án)', { ...secured, requestBody: body(ref('ProjectInput')), responses: { 200: ok(ref('Project')), 403: E[403], 404: E[404] } }),
        delete: op('Dự án', 'Xoá dự án và mọi công việc bên trong (chỉ chủ dự án)', { ...secured, responses: { 200: ok(s({ deletedTasks: int })), 403: E[403] } }),
      },
      '/api/projects/{id}/members': {
        parameters: [idParam()],
        get: op('Thành viên', 'Thành viên và lời mời đang chờ', {
          ...secured,
          responses: { 200: ok(s({ owner: ref('Member'), members: arr(ref('Member')), invites: arr(s({ email: str, invitedAt: date })), role: str })) },
        }),
        post: op('Thành viên', 'Mời bằng email (chỉ chủ dự án)', {
          ...secured,
          description: 'Email đã có tài khoản thì được thêm ngay, chưa có thì lưu lời mời và tự vào dự án khi đăng ký.',
          requestBody: body(s({ email: str }, ['email'])),
          responses: { 201: ok(s({ result: { type: 'string', enum: ['added', 'invited'] }, emailSent: bool })), 400: E[400], 403: E[403] },
        }),
      },
      '/api/projects/{id}/members/{userId}': {
        parameters: [idParam(), idParam('userId', 'Người cần xoá. Truyền id của chính mình để rời dự án')],
        delete: op('Thành viên', 'Xoá thành viên hoặc tự rời dự án', { ...secured, responses: { 200: { description: 'Thành công' }, 403: E[403] } }),
      },
      '/api/projects/{id}/invites': {
        parameters: [idParam(), { name: 'email', in: 'query', required: true, schema: str }],
        delete: op('Thành viên', 'Huỷ lời mời đang chờ', { ...secured, responses: { 200: { description: 'Thành công' } } }),
      },

      '/api/tasks': {
        get: op('Công việc', 'Danh sách công việc (lọc, tìm kiếm, sắp xếp, phân trang)', {
          ...secured,
          parameters: [
            { name: 'project', in: 'query', schema: str },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['todo', 'doing', 'done', 'open', 'overdue'] } },
            { name: 'priority', in: 'query', schema: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] } },
            { name: 'tag', in: 'query', schema: str },
            { name: 'search', in: 'query', schema: str, description: 'Tìm theo tiêu đề, mô tả' },
            { name: 'due', in: 'query', schema: { type: 'string', enum: ['today', 'week', 'overdue', 'none'] } },
            { name: 'sort', in: 'query', schema: { type: 'string', enum: ['board', 'newest', 'oldest', 'deadline', 'priority', 'updated', 'title'] } },
            tz,
          ],
          responses: { 200: { description: 'Thành công', ...json(s({ data: arr(ref('Task')), count: int })) } },
        }),
        post: op('Công việc', 'Tạo công việc', { ...secured, requestBody: body(ref('TaskInput')), responses: { 201: ok(ref('Task')), 400: E[400], 404: E[404] } }),
        delete: op('Công việc', 'Xoá các việc đã xong của một dự án', {
          ...secured,
          parameters: [{ name: 'project', in: 'query', required: true, schema: str }, { name: 'status', in: 'query', required: true, schema: { const: 'done' } }],
          responses: { 200: ok(s({ deletedCount: int })) },
        }),
      },
      '/api/tasks/tags': { get: op('Công việc', 'Các nhãn đang dùng', { ...secured, responses: { 200: ok(arr(s({ name: str, count: int }))) } }) },
      '/api/tasks/{id}': {
        parameters: [idParam()],
        get: op('Công việc', 'Chi tiết công việc', { ...secured, responses: { 200: ok(ref('Task')), 404: E[404] } }),
        patch: op('Công việc', 'Sửa công việc', { ...secured, parameters: [tz], requestBody: body(ref('TaskInput')), responses: { 200: { description: 'Thành công', ...json(ref('TaskResult')) }, 400: E[400] } }),
        delete: op('Công việc', 'Xoá công việc', { ...secured, responses: { 200: { description: 'Thành công' } } }),
      },
      '/api/tasks/{id}/toggle': {
        parameters: [idParam(), tz],
        patch: op('Công việc', 'Đánh dấu xong / mở lại. Việc lặp lại sẽ tự tạo lần kế tiếp', { ...secured, responses: { 200: { description: 'Thành công', ...json(ref('TaskResult')) } } }),
      },
      '/api/tasks/{id}/move': {
        parameters: [idParam(), tz],
        post: op('Công việc', 'Kéo thả trên bảng Kanban', {
          ...secured,
          requestBody: body(s({ status: { type: 'string', enum: ['todo', 'doing', 'done'] }, index: int }, ['status', 'index'])),
          responses: { 200: { description: 'Thành công', ...json(ref('TaskResult')) } },
        }),
      },
      '/api/tasks/{id}/comments': {
        parameters: [idParam()],
        get: op('Bình luận, ảnh, Pomodoro', 'Bình luận của công việc', { ...secured, responses: { 200: ok(arr(ref('Comment'))) } }),
        post: op('Bình luận, ảnh, Pomodoro', 'Viết bình luận', { ...secured, requestBody: body(s({ text: { type: 'string', maxLength: 1000 } }, ['text'])), responses: { 201: ok(ref('Comment')), 400: E[400] } }),
      },
      '/api/tasks/{id}/comments/{commentId}': {
        parameters: [idParam(), idParam('commentId')],
        delete: op('Bình luận, ảnh, Pomodoro', 'Xoá bình luận (người viết hoặc chủ dự án)', { ...secured, responses: { 200: { description: 'Thành công' }, 403: E[403] } }),
      },
      '/api/tasks/{id}/attachments': {
        parameters: [idParam()],
        post: op('Bình luận, ảnh, Pomodoro', 'Gắn ảnh đã tải lên Cloudinary', {
          ...secured,
          description: 'Trình duyệt tải ảnh thẳng lên Cloudinary bằng upload preset không ký, rồi gửi kết quả vào đây. Tối đa 10 ảnh mỗi công việc.',
          requestBody: body(s({ url: str, publicId: str, name: str, width: int, height: int, bytes: int }, ['url'])),
          responses: { 201: ok(ref('Task')), 400: E[400] },
        }),
      },
      '/api/tasks/{id}/attachments/{attachmentId}': {
        parameters: [idParam(), idParam('attachmentId')],
        delete: op('Bình luận, ảnh, Pomodoro', 'Gỡ ảnh', { ...secured, responses: { 200: ok(ref('Task')) } }),
      },
      '/api/tasks/{id}/pomodoros': {
        parameters: [idParam()],
        post: op('Bình luận, ảnh, Pomodoro', 'Ghi lại một phiên Pomodoro đã xong', {
          ...secured,
          requestBody: body(s({ minutes: { type: 'integer', minimum: 1, maximum: 120 } }, ['minutes'])),
          responses: { 200: ok(ref('Task')) },
        }),
      },

      '/api/dashboard': { get: op('Thống kê', 'Số liệu tổng quan', { ...secured, parameters: [tz], responses: { 200: ok({ type: 'object' }) } }) },
      '/api/activity': {
        get: op('Thống kê', 'Nhật ký hoạt động', {
          ...secured,
          parameters: [
            { name: 'type', in: 'query', schema: { type: 'string', enum: ['all', 'completed', 'created', 'team'] } },
            { name: 'limit', in: 'query', schema: { type: 'integer', maximum: 100 } },
          ],
          responses: { 200: ok(arr(ref('Activity'))) },
        }),
      },
      '/api/export': {
        get: op('Xuất, nhập dữ liệu', 'Tải dữ liệu của mình về (JSON hoặc CSV)', {
          ...secured,
          parameters: [
            { name: 'format', in: 'query', schema: { type: 'string', enum: ['json', 'csv'] } },
            { name: 'lang', in: 'query', schema: { type: 'string', enum: ['vi', 'en'] }, description: 'Ngôn ngữ tiêu đề cột CSV' },
          ],
          responses: { 200: { description: 'File tải về', content: { 'application/json': {}, 'text/csv': {} } } },
        }),
      },
      '/api/import': {
        post: op('Xuất, nhập dữ liệu', 'Nhập file JSON đã xuất (luôn thêm mới, không ghi đè)', {
          ...secured,
          requestBody: body({ type: 'object', description: 'Nội dung file JSON từ /api/export' }),
          responses: { 201: ok(s({ projects: int, tasks: int })), 400: E[400], 403: err('Tài khoản demo không nhập được'), 413: err('File quá lớn (tối đa 5 MB)') },
        }),
      },
    },
  };
}

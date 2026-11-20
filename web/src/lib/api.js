import { tr } from './i18n.js';
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, { status = 0, fields } = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

// ---------- Token đăng nhập ----------
// Lưu JWT trong localStorage và gửi qua header Authorization. Web (Vercel) và API (Render)
// khác tên miền nên cookie bên thứ ba hay bị trình duyệt chặn; header Bearer ổn định hơn.
const TOKEN_KEY = 'taskflow-token';
let token = null;
try {
  token = localStorage.getItem(TOKEN_KEY);
} catch {
  token = null;
}

export const getToken = () => token;

export function setToken(value) {
  token = value || null;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* trình duyệt chặn localStorage thì chỉ giữ trong bộ nhớ */
  }
}

let onUnauthorized = null;
/** AuthProvider đăng ký hàm này để tự đăng xuất khi token hết hạn. */
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

async function request(path, { method = 'GET', body, query, signal } = {}) {
  const url = new URL(`${API_URL}/api${path}`);
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  }

  let res;
  try {
    const headers = {};
    if (body) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    res = await fetch(url, { method, signal, headers, body: body ? JSON.stringify(body) : undefined });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(tr('Không kết nối được tới máy chủ'), { status: 0 });
  }

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Token hết hạn hoặc bị thu hồi: đăng xuất (trừ khi chính request đăng nhập bị từ chối)
    if (res.status === 401 && token && !path.startsWith('/auth/login') && !path.startsWith('/auth/register')) {
      onUnauthorized?.(payload?.error?.message);
    }
    // Máy chủ trả lời bằng tiếng Việt; dịch lại nếu đang dùng tiếng Anh
    const fields = payload?.error?.fields;
    throw new ApiError(tr(payload?.error?.message) || tr('Lỗi {status}', { status: res.status }), {
      status: res.status,
      fields: fields && Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, tr(v)])),
    });
  }
  return payload.data;
}

const tz = () => new Date().getTimezoneOffset();

export const api = {
  auth: {
    register: (data) => request('/auth/register', { method: 'POST', body: data }),
    login: (data) => request('/auth/login', { method: 'POST', body: data }),
    me: () => request('/auth/me'),
    update: (data) => request('/auth/me', { method: 'PATCH', body: data }),
    changePassword: (data) => request('/auth/change-password', { method: 'POST', body: data }),
    logoutAll: () => request('/auth/logout-all', { method: 'POST' }),
    remove: (password) => request('/auth/me', { method: 'DELETE', body: { password } }),
  },
  projects: {
    list: (archived = 'false') => request('/projects', { query: { archived } }),
    get: (id) => request(`/projects/${id}`),
    create: (data) => request('/projects', { method: 'POST', body: data }),
    update: (id, data) => request(`/projects/${id}`, { method: 'PATCH', body: data }),
    remove: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
  },
  tasks: {
    list: (query = {}) => request('/tasks', { query: { tzOffset: tz(), ...query } }),
    tags: () => request('/tasks/tags'),
    get: (id) => request(`/tasks/${id}`),
    create: (data) => request('/tasks', { method: 'POST', body: data }),
    update: (id, data) => request(`/tasks/${id}`, { method: 'PATCH', body: data }),
    toggle: (id) => request(`/tasks/${id}/toggle`, { method: 'PATCH' }),
    move: (id, status, index) => request(`/tasks/${id}/move`, { method: 'POST', body: { status, index } }),
    remove: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
    clearDone: (project) => request('/tasks', { method: 'DELETE', query: { status: 'done', project } }),
  },
  dashboard: () => request('/dashboard', { query: { tzOffset: tz() } }),
  activity: (type = 'all', limit = 30) => request('/activity', { query: { type, limit } }),
};

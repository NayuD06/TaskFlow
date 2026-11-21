// Gọi API TaskFlow. Token admin lưu riêng (taskflow-admin-token), không đụng phiên đăng nhập của web.
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
export const WEB_URL = (import.meta.env.VITE_WEB_URL || '').replace(/\/$/, '');
const TOKEN_KEY = 'taskflow-admin-token';

export class ApiError extends Error {
  constructor(message, { status = 0, fields } = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export const tokenStore = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY) || '';
    } catch {
      return '';
    }
  },
  set(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* trình duyệt chặn lưu trữ */
    }
  },
};

let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

async function request(path, { method = 'GET', body, query, token = tokenStore.get() } = {}) {
  const qs = query ? `?${new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== '' && v !== null))}` : '';
  let res;
  try {
    res = await fetch(`${API_URL}/api${path}${qs}`, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Không kết nối được tới máy chủ API. Máy chủ miễn phí trên Render có thể đang khởi động, thử lại sau 30 giây nhé.');
  }
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const message = payload?.error?.message || `Lỗi ${res.status}`;
    if (res.status === 401 && !path.startsWith('/auth/login')) onUnauthorized?.(message);
    throw new ApiError(message, { status: res.status, fields: payload?.error?.fields });
  }
  return payload;
}

const data = (p) => p.then((r) => r.data);

export const api = {
  login: (email, password) => data(request('/auth/login', { method: 'POST', body: { email, password }, token: '' })),
  me: (token) => data(request('/auth/me', { token })),
  stats: () => data(request('/admin/stats', { query: { tzOffset: new Date().getTimezoneOffset() } })),
  activity: (limit = 12) => data(request('/admin/activity', { query: { limit } })),
  users: (query) => request('/admin/users', { query }),
  updateUser: (id, body) => data(request(`/admin/users/${id}`, { method: 'PATCH', body })),
  deleteUser: (id) => data(request(`/admin/users/${id}`, { method: 'DELETE' })),
  images: (query) => data(request('/admin/images', { query })),
  deleteImages: (publicIds, force = false) => data(request('/admin/images', { method: 'DELETE', body: { publicIds, force } })),
};

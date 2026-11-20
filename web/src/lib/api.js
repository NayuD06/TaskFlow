export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, { status = 0, fields } = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

async function request(path, { method = 'GET', body, query, signal } = {}) {
  const url = new URL(`${API_URL}/api${path}`);
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  }

  let res;
  try {
    res = await fetch(url, {
      method,
      signal,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Không kết nối được tới máy chủ', { status: 0 });
  }

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(payload?.error?.message || `Lỗi ${res.status}`, {
      status: res.status,
      fields: payload?.error?.fields,
    });
  }
  return payload.data;
}

const tz = () => new Date().getTimezoneOffset();

export const api = {
  projects: {
    list: (archived = 'false') => request('/projects', { query: { archived } }),
    get: (id) => request(`/projects/${id}`),
    create: (data) => request('/projects', { method: 'POST', body: data }),
    update: (id, data) => request(`/projects/${id}`, { method: 'PATCH', body: data }),
    remove: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
  },
  tasks: {
    list: (query = {}) => request('/tasks', { query: { tzOffset: tz(), ...query } }),
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

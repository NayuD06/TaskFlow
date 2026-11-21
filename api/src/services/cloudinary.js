// Gọi Cloudinary Admin API từ máy chủ (cần CLOUDINARY_API_KEY và CLOUDINARY_API_SECRET).
// Chỉ đụng tới ảnh trong thư mục "taskflow/" (ảnh công việc và ảnh đại diện mà web tải lên),
// nên nếu tài khoản Cloudinary dùng chung với dự án khác thì ảnh của dự án đó vẫn an toàn.
import { env } from '../config/env.js';

export const ROOT_FOLDER = 'taskflow';
const PREFIX = `${ROOT_FOLDER}/`;
const PAGE_SIZE = 500; // tối đa Cloudinary cho phép mỗi lần
const MAX_PAGES = 10; // tối đa 5000 ảnh mỗi lần quét
const CACHE_MS = 60_000; // bản miễn phí chỉ được 500 lần gọi Admin API mỗi giờ

let fetchImpl = (...args) => fetch(...args);
let cache = null;

/** Chỉ dùng trong test: thay fetch bằng hàm giả. */
export function setCloudinaryFetch(fn) {
  fetchImpl = fn ?? ((...args) => fetch(...args));
  cache = null;
}

export const cloudinaryAdminReady = () => !!(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret);

/** Ảnh có thuộc thư mục của TaskFlow không (chặn xoá nhầm ảnh của dự án khác). */
export const isOwnPublicId = (publicId) => typeof publicId === 'string' && publicId.startsWith(PREFIX) && !publicId.includes('..');

/**
 * Lấy public_id từ link ảnh Cloudinary.
 * https://res.cloudinary.com/<cloud>/image/upload/[biến đổi/]v123/taskflow/tasks/abc.jpg -> taskflow/tasks/abc
 */
export function publicIdFromUrl(url) {
  if (typeof url !== 'string') return null;
  const m = url.match(/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/(.+)$/);
  if (!m) return null;
  let parts = m[1].split('?')[0].split('/');
  const version = parts.findIndex((p) => /^v\d+$/.test(p));
  if (version >= 0) parts = parts.slice(version + 1);
  else while (parts.length > 1 && /^[a-z]{1,3}_[^/]*$/.test(parts[0])) parts = parts.slice(1);
  const id = decodeURIComponent(parts.join('/')).replace(/\.[a-z0-9]{2,5}$/i, '');
  return id || null;
}

function cloudinaryError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function call(path, { method = 'GET', query } = {}) {
  const { cloudName, apiKey, apiSecret } = env.cloudinary;
  const qs = query ? `?${query}` : '';
  let res;
  try {
    res = await fetchImpl(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}${path}${qs}`, {
      method,
      headers: { Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}` },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw cloudinaryError(502, 'Không kết nối được tới Cloudinary, hãy thử lại');
  }
  const data = await res.json().catch(() => ({}));
  if (res.ok) return data;
  if (res.status === 401 || res.status === 403) {
    throw cloudinaryError(502, 'Cloudinary từ chối khoá API. Hãy kiểm tra CLOUDINARY_API_KEY và CLOUDINARY_API_SECRET trên máy chủ.');
  }
  if (res.status === 420 || res.status === 429) throw cloudinaryError(429, 'Đã gọi Cloudinary quá nhiều lần trong giờ này, hãy thử lại sau.');
  throw cloudinaryError(502, `Cloudinary báo lỗi: ${data?.error?.message || res.status}`);
}

const toImage = (r) => ({
  publicId: r.public_id,
  url: r.secure_url,
  format: r.format || '',
  bytes: r.bytes || 0,
  width: r.width || 0,
  height: r.height || 0,
  createdAt: r.created_at || null,
  // Thư mục con ngay dưới taskflow/: "tasks", "avatars"...
  folder: r.public_id.slice(PREFIX.length).split('/').slice(0, -1).join('/') || '',
});

/** Mọi ảnh trong thư mục taskflow/, mới nhất trước. Lưu tạm 60 giây cho đỡ tốn lượt gọi. */
export async function listImages({ refresh = false } = {}) {
  if (!refresh && cache && Date.now() - cache.at < CACHE_MS) return cache.data;
  const images = [];
  let cursor = '';
  let truncated = false;
  for (let page = 0; page < MAX_PAGES; page++) {
    const query = new URLSearchParams({ prefix: PREFIX, max_results: String(PAGE_SIZE) });
    if (cursor) query.set('next_cursor', cursor);
    const data = await call('/resources/image/upload', { query: query.toString() });
    for (const r of data.resources || []) if (isOwnPublicId(r.public_id)) images.push(toImage(r));
    cursor = data.next_cursor || '';
    if (!cursor) break;
    if (page === MAX_PAGES - 1) truncated = true;
  }
  images.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const data = { images, truncated, fetchedAt: new Date().toISOString() };
  cache = { at: Date.now(), data };
  return data;
}

/** Dung lượng đã dùng của tài khoản Cloudinary. Lỗi thì trả null (không quan trọng bằng danh sách ảnh). */
export async function getUsage() {
  try {
    const u = await call('/usage');
    const pick = (x) => (x && typeof x === 'object' ? { usage: x.usage ?? null, limit: x.limit ?? null, usedPercent: x.used_percent ?? null } : null);
    return {
      plan: u.plan || '',
      lastUpdated: u.last_updated || null,
      storage: pick(u.storage),
      bandwidth: pick(u.bandwidth),
      transformations: pick(u.transformations),
      credits: pick(u.credits),
      resources: typeof u.resources === 'number' ? u.resources : null,
    };
  } catch {
    return null;
  }
}

/** Xoá ảnh theo public_id (mỗi lần gọi tối đa 100). Trả về { deleted: [], notFound: [] }. */
export async function deleteImages(publicIds) {
  const ids = [...new Set(publicIds)].filter(isOwnPublicId);
  const deleted = [];
  const notFound = [];
  for (let i = 0; i < ids.length; i += 100) {
    const query = new URLSearchParams();
    for (const id of ids.slice(i, i + 100)) query.append('public_ids[]', id);
    const data = await call('/resources/image/upload', { method: 'DELETE', query: query.toString() });
    for (const [id, state] of Object.entries(data.deleted || {})) (state === 'deleted' ? deleted : notFound).push(id);
  }
  cache = null;
  return { deleted, notFound };
}

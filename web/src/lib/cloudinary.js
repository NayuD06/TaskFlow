// Tải ảnh thẳng từ trình duyệt lên Cloudinary. Máy chủ TaskFlow chỉ ký cho từng lần tải
// (POST /api/uploads/sign, cần CLOUDINARY_URL trên máy chủ), không phải nhận file nên nhẹ hơn, và chỉ lưu lại link ảnh.
// Máy chủ cũ dùng "upload preset" không ký thì vẫn tải theo cách đó.
import { api } from './api.js';
import { tr } from './i18n.js';

const MAX_BYTES = 10 * 1024 * 1024;
const TYPES = /^image\/(png|jpeg|webp|gif|heic|heif)$/;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(tr('Không đọc được ảnh này')));
    };
    img.src = url;
  });
}

/** Ảnh lớn được thu nhỏ còn cạnh dài tối đa `max` px trước khi tải lên, cho nhanh và đỡ tốn dung lượng. */
async function shrink(file, max = 2000) {
  if (file.type === 'image/gif' || file.size < 600 * 1024) return file;
  try {
    const img = await loadImage(file);
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.webp', { type: 'image/webp' });
  } catch {
    return file;
  }
}

/**
 * Tải một ảnh lên. onProgress(0..1) để hiện thanh tiến trình.
 * Trả về { url, publicId, name, width, height, bytes } đúng dạng API TaskFlow cần.
 */
export async function uploadImage(file, { cloudName, signed, uploadPreset, kind = 'tasks', onProgress } = {}) {
  if (!cloudName || (!signed && !uploadPreset)) throw new Error(tr('Máy chủ chưa bật tải ảnh'));
  if (!TYPES.test(file.type)) throw new Error(tr('Chỉ nhận ảnh PNG, JPG, WEBP hoặc GIF'));
  if (file.size > MAX_BYTES) throw new Error(tr('Ảnh quá lớn, hãy chọn ảnh dưới 10 MB'));

  const [ready, ticket] = await Promise.all([shrink(file), signed ? api.signUpload(kind) : null]);
  const body = new FormData();
  body.append('file', ready);
  if (ticket) {
    // Thư mục, thời điểm và loại file nằm trong chữ ký nên phải gửi đúng như máy chủ trả về
    body.append('api_key', ticket.apiKey);
    body.append('timestamp', ticket.timestamp);
    body.append('folder', ticket.folder);
    body.append('allowed_formats', ticket.allowed_formats);
    body.append('signature', ticket.signature);
  } else {
    body.append('upload_preset', uploadPreset);
    body.append('folder', `taskflow/${kind}`);
  }

  const result = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${encodeURIComponent(ticket?.cloudName || cloudName)}/image/upload`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      let data = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* bỏ qua */
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) resolve(data);
      else reject(new Error(data?.error?.message ? tr('Tải ảnh thất bại: {reason}', { reason: data.error.message }) : tr('Tải ảnh thất bại, hãy thử lại')));
    };
    xhr.onerror = () => reject(new Error(tr('Không kết nối được tới máy chủ ảnh')));
    xhr.send(body);
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    name: file.name.slice(0, 120),
    width: result.width,
    height: result.height,
    bytes: result.bytes,
  };
}

/** Link ảnh đã thu nhỏ, tự chọn định dạng nhẹ nhất (Cloudinary biến đổi ngay trên link). */
export function cloudinaryThumb(url, width = 480, height) {
  if (!url?.includes('/image/upload/')) return url;
  const size = height ? `c_fill,w_${width},h_${height}` : `c_limit,w_${width}`;
  return url.replace('/image/upload/', `/image/upload/${size},f_auto,q_auto/`);
}

export const isCloudinaryUrl = (url) => typeof url === 'string' && url.startsWith('https://res.cloudinary.com/');

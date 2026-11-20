import { AVATAR_MAX_LENGTH } from './constants.js';
import { tr } from './i18n.js';

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

/**
 * Cắt ảnh thành hình vuông ở giữa, thu nhỏ còn 160px rồi nén (webp, hoặc jpeg nếu trình duyệt không hỗ trợ).
 * Kết quả là data URL đủ nhỏ để lưu thẳng trong tài khoản (dưới 60.000 ký tự).
 */
export async function avatarFromFile(file, size = 160) {
  if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) throw new Error(tr('Chỉ nhận ảnh PNG, JPG, WEBP hoặc GIF'));
  if (file.size > 8 * 1024 * 1024) throw new Error(tr('Ảnh quá lớn, hãy chọn ảnh dưới 8 MB'));
  const img = await loadImage(file);
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);

  for (const quality of [0.86, 0.75, 0.62, 0.5]) {
    let url = canvas.toDataURL('image/webp', quality);
    if (!url.startsWith('data:image/webp')) url = canvas.toDataURL('image/jpeg', quality);
    if (url.length <= AVATAR_MAX_LENGTH) return url;
  }
  throw new Error(tr('Ảnh vẫn quá lớn sau khi nén, hãy thử ảnh khác'));
}

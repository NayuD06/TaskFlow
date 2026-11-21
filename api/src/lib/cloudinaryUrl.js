// Đọc biến CLOUDINARY_URL dạng cloudinary://API_KEY:API_SECRET@CLOUD_NAME
// (chép nguyên dòng "API environment variable" trong trang API Keys của Cloudinary).

/** Trả về { cloudName, apiKey, apiSecret }, hoặc {} nếu trống hay sai dạng. */
export function parseCloudinaryUrl(raw) {
  const value = String(raw ?? '')
    .trim()
    .replace(/^CLOUDINARY_URL\s*=\s*/i, '') // lỡ dán cả "CLOUDINARY_URL=" vào ô giá trị
    .replace(/^['"]|['"]$/g, '');
  if (!value) return {};
  const match = value.match(/^cloudinary:\/\/([^:@/\s]+):([^@/\s]+)@([a-zA-Z0-9_-]+)\/?$/);
  if (!match) return { invalid: true };
  const [, apiKey, apiSecret, cloudName] = match;
  // Còn chữ mẫu <your_api_secret> nghĩa là chưa thay bằng khoá thật
  if (/[<>]/.test(apiKey + apiSecret)) return { invalid: true };
  return { cloudName, apiKey: decodeURIComponent(apiKey), apiSecret: decodeURIComponent(apiSecret) };
}

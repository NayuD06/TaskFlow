import EN from './i18n-en.js';

/*
 * Song ngữ Việt / Anh, viết tay cho nhẹ (không cần thư viện).
 * - Câu tiếng Việt chính là "khoá": tr('Đã lưu') -> 'Saved' khi đang ở tiếng Anh.
 * - Biến chèn bằng ngoặc nhọn: tr('Đã xoá “{title}”', { title }) .
 * - Bản dịch nằm ở lib/i18n-en.js. Câu nào chưa có bản dịch thì giữ nguyên tiếng Việt.
 * - Đổi ngôn ngữ sẽ tải lại trang để mọi chữ (kể cả hằng số) đổi theo.
 */
const KEY = 'taskflow-lang';
export const LANGS = [
  { code: 'vi', label: 'Tiếng Việt', short: 'VI' },
  { code: 'en', label: 'English', short: 'EN' },
];

function detect() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'vi' || saved === 'en') return saved;
  } catch {
    /* bỏ qua */
  }
  const prefs = typeof navigator !== 'undefined' ? navigator.languages || [navigator.language] : [];
  // Người dùng Việt là chính: chỉ chuyển sang tiếng Anh khi trình duyệt không ưu tiên tiếng Việt
  return prefs.some((l) => /^vi\b/i.test(l || '')) || !prefs.length ? 'vi' : 'en';
}

export const lang = detect();
export const locale = lang === 'en' ? 'en-US' : 'vi-VN';
if (typeof document !== 'undefined') document.documentElement.lang = lang;

/** Dịch một câu. Bản dịch có thể là hàm (để chia số ít / số nhiều). */
export function tr(text, vars) {
  if (text === undefined || text === null) return text;
  // "Câu|ngữ cảnh": cùng một câu tiếng Việt nhưng tiếng Anh cần dịch khác (vd 'Dự án|một' -> 'Project')
  let out = text.includes('|') ? text.slice(0, text.indexOf('|')) : text;
  if (lang === 'en') {
    const entry = EN[text];
    if (typeof entry === 'function') out = entry(vars || {});
    else if (entry !== undefined) out = entry;
  }
  if (vars) out = String(out).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined && vars[k] !== null ? vars[k] : m));
  return out;
}

export function setLang(code) {
  if (code === lang) return;
  try {
    localStorage.setItem(KEY, code);
  } catch {
    /* bỏ qua */
  }
  window.location.reload();
}

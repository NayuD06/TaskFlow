/** Bỏ dấu tiếng Việt và viết thường để tìm kiếm không phân biệt dấu ("Đồ án" khớp "do an"). */
export const fold = (s = '') => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

export const MAX_TAGS = 8;
export const MAX_TAG_LENGTH = 24;

/** Chuẩn hoá một nhãn giống phía server: bỏ dấu # ở đầu, gộp khoảng trắng, cắt độ dài. */
export const cleanTag = (raw = '') => raw.replace(/^#+/, '').replace(/\s+/g, ' ').trim().slice(0, MAX_TAG_LENGTH);

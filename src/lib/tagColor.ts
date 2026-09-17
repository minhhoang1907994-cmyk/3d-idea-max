/**
 * Màu nền cho ô phân loại (ví dụ cột "Loại" của sổ tư liệu).
 *
 * Cùng một tên loại luôn ra cùng một màu, kể cả khi danh sách loại đổi thứ tự hay
 * có loại mới chen vào — nên màu suy ra từ chính chuỗi tên, KHÔNG lấy theo vị trí
 * trong mảng. Pure function, không import React (xem CLAUDE.md > lib/).
 */

export type TagColor = {
  background: string;
  border: string;
  text: string;
};

/**
 * Bảng màu nhạt — đủ khác nhau để phân biệt liếc mắt, đủ nhạt để chữ đen vẫn đọc rõ.
 */
const TAG_COLORS: readonly TagColor[] = [
  { background: '#fdecef', border: '#f0bac6', text: '#8a2740' },
  { background: '#fdf2de', border: '#eccf93', text: '#7a5312' },
  { background: '#eff7dd', border: '#c6e19b', text: '#4d6b1a' },
  { background: '#e1f5f0', border: '#9fdccd', text: '#1d6355' },
  { background: '#e6f1fd', border: '#a9ccf1', text: '#1c4f7c' },
  { background: '#ecebfc', border: '#bcb8ef', text: '#3b3595' },
  { background: '#f5ecfb', border: '#d7b8ec', text: '#6a2a8c' },
  { background: '#f3ece4', border: '#d5bfa7', text: '#6b4a2b' },
  { background: '#edf0f4', border: '#c2ccd7', text: '#3c4756' },
  { background: '#fdeee7', border: '#f0c3ac', text: '#8a3c18' },
];

/**
 * Màu của một giá trị phân loại. Chuỗi rỗng (chưa điền loại) trả `null` — ô giữ
 * nguyên nền trắng để nhìn ra ngay dòng còn thiếu dữ liệu.
 *
 * So khớp không phân biệt hoa thường và khoảng trắng thừa: "Trick" và "trick "
 * là cùng một loại nên phải cùng màu.
 */
export function tagColor(value: string): TagColor | null {
  const key = value.trim().toLowerCase();
  if (key.length === 0) return null;

  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (Math.imul(hash, 31) + key.charCodeAt(index)) >>> 0;
  }
  return TAG_COLORS[hash % TAG_COLORS.length] ?? null;
}

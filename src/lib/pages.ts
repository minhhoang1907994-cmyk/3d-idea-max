/** Danh sách trang của app — SiteHeader đọc từ đây, không hardcode trong JSX */
export type PageId = 'mix' | 'image' | 'data' | 'company';

export type PageItem = {
  id: PageId;
  label: string;
  description: string;
  icon: string;
};

export const PAGE_ITEMS: PageItem[] = [
  {
    id: 'company',
    label: 'Sổ công ty',
    description: 'Thu, chi, note, sản phẩm',
    icon: '📒',
  },
  { id: 'mix', label: 'Trộn ý tưởng', description: 'Sinh prompt + thông số in', icon: '🎲' },
  {
    id: 'image',
    label: 'Phân tích ảnh',
    description: 'Upload ảnh → sinh prompt tương tự',
    icon: '🖼️',
  },
  { id: 'data', label: 'Quản lý dữ liệu', description: 'Xem, thêm, sửa, xóa option', icon: '🗂️' },
];

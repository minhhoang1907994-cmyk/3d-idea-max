import styles from './SideMenu.module.css';

export type PageId = 'mix' | 'image' | 'convert' | 'data' | 'company';

type Props = {
  current: PageId;
  onNavigate: (page: PageId) => void;
  /** Trang nào đang có thay đổi chưa lưu — hiện chấm cảnh báo cạnh mục đó */
  dirtyPages: readonly PageId[];
};

const ITEMS: { id: PageId; label: string; description: string; icon: string }[] = [
  { id: 'mix', label: 'Trộn ý tưởng', description: 'Sinh prompt + thông số in', icon: '🎲' },
  {
    id: 'image',
    label: 'Phân tích ảnh',
    description: 'Upload ảnh → sinh prompt tương tự',
    icon: '🖼️',
  },
  {
    id: 'convert',
    label: 'Đổi slicer',
    description: 'File 3mf Bambu → slicer khác',
    icon: '🔁',
  },
  { id: 'data', label: 'Quản lý dữ liệu', description: 'Xem, thêm, sửa, xóa option', icon: '🗂️' },
  {
    id: 'company',
    label: 'Sổ công ty',
    description: 'Thu, chi, note, sản phẩm',
    icon: '📒',
  },
];

export function SideMenu({ current, onNavigate, dirtyPages }: Props) {
  return (
    <nav className={styles.menu} aria-label="Điều hướng chính">
      <div className={styles.brand}>
        <span className={styles.brandMark}>3D</span>
        <span className={styles.brandName}>Idea Max</span>
      </div>

      <ul className={styles.list}>
        {ITEMS.map((item) => {
          const isActive = item.id === current;
          return (
            <li key={item.id}>
              <button
                type="button"
                className={isActive ? `${styles.item} ${styles.itemActive}` : styles.item}
                onClick={() => onNavigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className={styles.icon} aria-hidden="true">
                  {item.icon}
                </span>
                <span className={styles.itemText}>
                  <span className={styles.itemLabel}>
                    {item.label}
                    {dirtyPages.includes(item.id) ? (
                      <span className={styles.dot} title="Có thay đổi chưa lưu" />
                    ) : null}
                  </span>
                  <span className={styles.itemDescription}>{item.description}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

import { PAGE_ITEMS, type PageId } from '../lib/pages';
import styles from './SiteHeader.module.css';

type Props = {
  current: PageId;
  onNavigate: (page: PageId) => void;
  /** Trang nào đang có thay đổi chưa lưu — hiện chấm cảnh báo cạnh mục đó */
  dirtyPages: readonly PageId[];
};

/** Đầu trang dùng chung: thương hiệu + điều hướng 4 trang. Cặp màu với SiteFooter */
export function SiteHeader({ current, onNavigate, dirtyPages }: Props) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <img className={styles.logo} src="/logo.png" alt="H2T Cobra" width={432} height={483} />
          <div className={styles.brandText}>
            <span className={styles.brandName}>H2T Cobra 3D</span>
            <span className={styles.brandNote}>Ý tưởng &amp; thông số in 3D cho cả nhóm</span>
          </div>
        </div>

        <nav className={styles.nav} aria-label="Điều hướng chính">
          {PAGE_ITEMS.map((item) => {
            const isActive = item.id === current;
            return (
              <button
                key={item.id}
                type="button"
                className={isActive ? `${styles.item} ${styles.itemActive}` : styles.item}
                title={item.description}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onNavigate(item.id)}
              >
                <span className={styles.icon} aria-hidden="true">
                  {item.icon}
                </span>
                <span className={styles.itemLabel}>{item.label}</span>
                {dirtyPages.includes(item.id) ? (
                  <span className={styles.dot} title="Có thay đổi chưa lưu" />
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

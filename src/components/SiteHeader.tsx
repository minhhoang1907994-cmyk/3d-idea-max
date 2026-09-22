import { PAGE_ITEMS, type PageId } from '../lib/pages';
import styles from './SiteHeader.module.css';

type Props = {
  current: PageId;
};

/** Đầu trang dùng chung, cặp với SiteFooter. Chỉ hiện ở khổ rộng — xem SiteHeader.module.css */
export function SiteHeader({ current }: Props) {
  const currentItem = PAGE_ITEMS.find((item) => item.id === current);

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

        {currentItem ? (
          <span className={styles.currentPage}>
            <span className={styles.currentIcon} aria-hidden="true">
              {currentItem.icon}
            </span>
            {currentItem.label}
          </span>
        ) : null}
      </div>
    </header>
  );
}

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { HOME_PAGE_ID, PAGE_ITEMS, type PageId } from '../lib/pages';
import { SiteNavDrawer } from './SiteNavDrawer';
import styles from './SiteHeader.module.css';

type Props = {
  current: PageId;
  onNavigate: (page: PageId) => void;
  /** Trang nào đang có thay đổi chưa lưu — hiện chấm cảnh báo cạnh mục đó */
  dirtyPages: readonly PageId[];
};

/** Mốc đổi sang nút ba gạch — khớp với media query trong SiteHeader.module.css */
const DRAWER_QUERY = '(max-width: 1024px)';

/**
 * Đầu trang dùng chung: thương hiệu + điều hướng 4 trang. Cặp màu với SiteFooter.
 *
 * Từ 1024px trở xuống hàng nút điều hướng nhường chỗ cho nút ba gạch, mở ra SiteNavDrawer
 * — ngăn kéo này gánh luôn phần chân trang vì SiteFooter bị ẩn ở khổ đó.
 */
export function SiteHeader({ current, onNavigate, dirtyPages }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    toggleRef.current?.focus();
  }, []);

  // Kéo cửa sổ rộng ra thì hàng nút đã hiện lại đầy đủ. Để `menuOpen` nguyên là true sẽ
  // khoá cuộn trang trong khi nút ba gạch — chỗ duy nhất đóng được — đã bị CSS ẩn đi.
  useEffect(() => {
    const isDrawer = window.matchMedia(DRAWER_QUERY);
    const syncToWidth = () => {
      if (!isDrawer.matches) setMenuOpen(false);
    };

    syncToWidth();
    isDrawer.addEventListener('change', syncToWidth);
    return () => isDrawer.removeEventListener('change', syncToWidth);
  }, []);

  return (
    <header className={menuOpen ? `${styles.header} ${styles.headerMenuOpen}` : styles.header}>
      <div className={styles.inner}>
        <button
          type="button"
          className={styles.brand}
          aria-label="Về trang chủ"
          onClick={() => onNavigate(HOME_PAGE_ID)}
        >
          <img className={styles.logo} src="/logo.png" alt="H2T Cobra" width={432} height={483} />
          <span className={styles.brandText}>
            <span className={styles.brandName}>H2T Cobra 3D</span>
            <span className={styles.brandNote}>Ý tưởng &amp; thông số in 3D cho cả nhóm</span>
          </span>
        </button>

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

        <button
          ref={toggleRef}
          type="button"
          className={styles.toggle}
          aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={menuOpen}
          aria-controls={panelId}
          onClick={() => (menuOpen ? closeMenu() : setMenuOpen(true))}
        >
          <span className={styles.toggleBars} aria-hidden="true">
            <span className={styles.bar} />
            <span className={styles.bar} />
            <span className={styles.bar} />
          </span>
          {dirtyPages.length > 0 ? (
            <span className={styles.toggleDot} title="Có thay đổi chưa lưu" />
          ) : null}
        </button>
      </div>

      {menuOpen ? (
        <SiteNavDrawer
          panelId={panelId}
          current={current}
          onNavigate={onNavigate}
          dirtyPages={dirtyPages}
          onClose={closeMenu}
        />
      ) : null}
    </header>
  );
}

import { useEffect, useRef, type KeyboardEvent } from 'react';
import { PAGE_ITEMS, type PageId } from '../lib/pages';
import { SOCIAL_LINKS } from '../lib/socialLinks';
import styles from './SiteNavDrawer.module.css';

type Props = {
  /** Chỉ dựng khi mở — đóng là gỡ hẳn khỏi cây, nút bên trong không bắt Tab nữa */
  onClose: () => void;
  current: PageId;
  onNavigate: (page: PageId) => void;
  dirtyPages: readonly PageId[];
  /** Khớp với aria-controls của nút ba gạch bên SiteHeader */
  panelId: string;
};

/**
 * Ngăn kéo điều hướng cho khổ hẹp (≤1024px): trượt từ mép phải khi bấm nút ba
 * gạch. Ngoài 4 trang còn có luôn phần chân trang (mạng xã hội + dòng bản quyền) vì ở
 * khổ này SiteFooter bị ẩn — xem SiteFooter.module.css.
 */
export function SiteNavDrawer({ onClose, current, onNavigate, dirtyPages, panelId }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const year = new Date().getFullYear();

  // Esc để thoát, và khoá cuộn nền cho khỏi cuộn nhầm trang phía sau lớp phủ
  useEffect(() => {
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  // Mở ra thì đưa focus vào đúng mục đang xem, để người dùng bàn phím không phải dò lại
  useEffect(() => {
    const panel = panelRef.current;
    const active = panel?.querySelector<HTMLButtonElement>('[aria-current="page"]');
    (active ?? panel?.querySelector<HTMLButtonElement>('button'))?.focus();
  }, []);

  // Giữ Tab quẩn trong ngăn kéo: lớp phủ đã chặn chuột với phần nền, bàn phím phải theo
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;

    const focusables = panelRef.current?.querySelectorAll<HTMLElement>('button, a[href]');
    if (!focusables || focusables.length === 0) return;

    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      <button
        type="button"
        className={styles.overlay}
        aria-label="Đóng menu"
        tabIndex={-1}
        onClick={onClose}
      />

      <div
        id={panelId}
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        onKeyDown={handleKeyDown}
      >
        <div className={styles.head}>
          <img className={styles.logo} src="/logo.png" alt="H2T Cobra" width={432} height={483} />
          <span className={styles.brandName}>H2T Cobra 3D</span>
          {/* Lớp phủ che cả nút ba gạch nên phải có chỗ đóng nằm trong chính ngăn kéo */}
          <button type="button" className={styles.close} aria-label="Đóng menu" onClick={onClose}>
            ✕
          </button>
        </div>

        <nav className={styles.nav} aria-label="Điều hướng chính">
          {PAGE_ITEMS.map((item) => {
            const isActive = item.id === current;
            return (
              <button
                key={item.id}
                type="button"
                className={isActive ? `${styles.item} ${styles.itemActive}` : styles.item}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
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
            );
          })}
        </nav>

        <div className={styles.footer}>
          <nav className={styles.social} aria-label="Mạng xã hội">
            {SOCIAL_LINKS.map((link) => (
              <a
                key={link.id}
                className={styles.socialLink}
                href={link.href}
                target="_blank"
                rel="noreferrer noopener"
              >
                <svg className={styles.socialIcon} viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d={link.iconPath} />
                </svg>
                <span>{link.label}</span>
              </a>
            ))}
          </nav>

          <p className={styles.note}>Ý tưởng &amp; thông số in 3D cho cả nhóm</p>
          <p className={styles.copyright}>© {year} H2T Cobra 3D Printing Solutions</p>
        </div>
      </div>
    </>
  );
}

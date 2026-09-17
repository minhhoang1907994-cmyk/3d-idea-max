import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
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

/**
 * Trên desktop đây là cột menu cố định bên trái. Dưới 760px nó thu thành ngăn kéo trượt từ
 * trái, mở bằng nút ba gạch trên thanh trên — `open` vì thế chỉ có tác dụng ở dạng điện
 * thoại, CSS ẩn hẳn thanh trên và lớp phủ ở khổ rộng.
 */
export function SideMenu({ current, onNavigate, dirtyPages }: Props) {
  const [open, setOpen] = useState(false);
  const navId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    toggleRef.current?.focus();
  }, []);

  // Esc để thoát, và khoá cuộn nền cho khỏi cuộn nhầm trang phía sau lớp phủ
  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const previousOverflow = document.body.style.overflow;

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, close]);

  // Mở ra thì đưa focus vào đúng mục đang xem, để người dùng bàn phím không phải dò lại
  useEffect(() => {
    if (!open) return;
    navRef.current?.querySelector<HTMLButtonElement>('[aria-current="page"]')?.focus();
  }, [open]);

  // Kéo cửa sổ rộng ra thì menu vốn đã luôn hiện. Để `open` nguyên là true sẽ khoá cuộn
  // trang trong khi nút ba gạch — chỗ duy nhất đóng được — đã bị CSS ẩn đi.
  useEffect(() => {
    const isDrawer = window.matchMedia('(max-width: 760px)');
    const syncToWidth = () => {
      if (!isDrawer.matches) setOpen(false);
    };

    syncToWidth();
    isDrawer.addEventListener('change', syncToWidth);
    return () => isDrawer.removeEventListener('change', syncToWidth);
  }, []);

  // Giữ Tab quẩn trong ngăn kéo: lớp phủ đã chặn chuột với phần nền, bàn phím phải theo
  const handleNavKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Tab' || !open) return;

    const focusables = navRef.current?.querySelectorAll<HTMLButtonElement>('button');
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

  const currentItem = ITEMS.find((item) => item.id === current);

  return (
    <>
      <div className={styles.topbar}>
        <button
          ref={toggleRef}
          type="button"
          className={styles.toggle}
          aria-label={open ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={open}
          aria-controls={navId}
          onClick={() => (open ? close() : setOpen(true))}
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

        <img
          className={styles.topbarLogo}
          src="/logo.png"
          alt="H2T Cobra"
          width={432}
          height={483}
        />

        <span className={styles.currentPage}>{currentItem?.label}</span>
      </div>

      {open ? (
        <button
          type="button"
          className={styles.overlay}
          aria-label="Đóng menu"
          tabIndex={-1}
          onClick={close}
        />
      ) : null}

      <nav
        id={navId}
        ref={navRef}
        className={open ? `${styles.menu} ${styles.menuOpen}` : styles.menu}
        aria-label="Điều hướng chính"
        onKeyDown={handleNavKeyDown}
      >
        <div className={styles.brand}>
          <img
            className={styles.brandLogo}
            src="/logo.png"
            alt="H2T Cobra — 3D Printing Solutions"
            width={432}
            height={483}
          />
        </div>

        <ul className={styles.list}>
          {ITEMS.map((item) => {
            const isActive = item.id === current;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={isActive ? `${styles.item} ${styles.itemActive}` : styles.item}
                  onClick={() => {
                    onNavigate(item.id);
                    setOpen(false);
                  }}
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
    </>
  );
}

import { useEffect, useState } from 'react';
import styles from './ScrollToTopButton.module.css';

/** Cuộn quá màn hình đầu tiên mới hiện nút — trên đầu trang thì nút chỉ che nội dung */
const SHOW_AFTER_PX = 320;

/**
 * Nút quay lại đầu trang, neo góc dưới phải.
 * Các trang dài (Sổ công ty, Quản lý dữ liệu) cuộn hàng trăm dòng, kéo tay ngược lên rất mệt.
 */
export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(window.scrollY > SHOW_AFTER_PX);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      className={styles.button}
      title="Lên đầu trang"
      aria-label="Lên đầu trang"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      <span aria-hidden="true">↑</span>
    </button>
  );
}

import { useEffect, useRef, useState } from 'react';
import styles from './LongTextCell.module.css';

type Props = {
  value: string;
  /** Tên cột, dùng cho aria-label và tiêu đề hộp thoại */
  label: string;
  placeholder?: string;
  onChange: (next: string) => void;
};

/**
 * Ô nội dung dài: trong bảng chỉ là một nút gọn, bấm vào mới mở hộp thoại có ô nhập.
 *
 * Dùng thẻ <dialog> của trình duyệt với showModal() chứ không tự dựng lớp phủ: Esc để
 * thoát, khoá thao tác với nền và bẫy focus đều có sẵn, khỏi làm lại như SiteNavDrawer.
 *
 * Gõ tới đâu ghi tới đó (giống mọi ô khác trong bảng) — hộp thoại không có nút Huỷ, vì
 * nửa bảng ghi ngay mà riêng ô này phải bấm Lưu thì mới là chỗ dễ mất dữ liệu.
 */
export function LongTextCell({ value, label, placeholder, onChange }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);

  // showModal() phải gọi sau khi <dialog> đã nằm trong DOM, nên đi qua state chứ không
  // gọi thẳng trong onClick — React chưa kịp dựng thẻ ở thời điểm đó.
  useEffect(() => {
    if (!open) return;
    dialogRef.current?.showModal();
    textareaRef.current?.focus();
  }, [open]);

  // Nút chỉ hiện đúng chữ "Chi tiết" — nội dung xem trong hộp thoại. Đã điền hay chưa
  // thì phân biệt bằng nét viền (đứt/liền), không phải bằng chữ.
  const filled = value.trim().length > 0;

  return (
    <div className={styles.cell}>
      <button
        type="button"
        className={filled ? `${styles.trigger} ${styles.triggerFilled}` : styles.trigger}
        aria-label={filled ? `Xem ${label.toLowerCase()}` : `Thêm ${label.toLowerCase()}`}
        onClick={() => setOpen(true)}
      >
        Chi tiết
      </button>

      {open ? (
        <dialog ref={dialogRef} className={styles.dialog} onClose={() => setOpen(false)}>
          <form method="dialog" className={styles.form}>
            <div className={styles.head}>
              <h2 className={styles.title}>{label}</h2>
              <button type="submit" className={styles.close} aria-label="Đóng">
                ✕
              </button>
            </div>

            <textarea
              ref={textareaRef}
              className={styles.textarea}
              value={value}
              rows={12}
              placeholder={placeholder}
              aria-label={label}
              onChange={(event) => onChange(event.target.value)}
            />

            <div className={styles.foot}>
              <span className={styles.hint}>Gõ tới đâu lưu tới đó — nhớ bấm Lưu ở đầu trang</span>
              <button type="submit" className={styles.done}>
                Xong
              </button>
            </div>
          </form>
        </dialog>
      ) : null}
    </div>
  );
}

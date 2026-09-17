import { useState } from 'react';
import { tagColor } from '../lib/tagColor';
import styles from './TagSelect.module.css';

type Props = {
  value: string;
  /** Các loại đã có trong sổ — luôn hiện ĐỦ, không lọc theo chữ đang gõ */
  options: readonly string[];
  label: string;
  placeholder?: string;
  onChange: (next: string) => void;
};

/**
 * Ô phân loại: vừa chọn được loại đã có, vừa gõ được loại mới.
 *
 * KHÔNG dùng `<datalist>` như các ô text khác: trình duyệt lọc gợi ý theo chữ đang
 * có trong ô, nên dòng đã điền loại rồi thì bấm xuống chỉ thấy đúng loại của chính
 * nó — không đổi sang loại khác được. Danh sách ở đây tự vẽ nên luôn đủ loại.
 *
 * Menu nằm trong luồng (đẩy dòng cao lên) chứ không position: absolute, vì bảng
 * nằm trong khung cuộn ngang — menu tuyệt đối sẽ bị khung đó cắt mất.
 */
export function TagSelect({ value, options, label, placeholder, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const color = tagColor(value);
  const current = value.trim().toLowerCase();

  const fieldStyle = color
    ? { background: color.background, borderColor: color.border, color: color.text }
    : undefined;

  return (
    <div
      className={styles.cell}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <div className={styles.field}>
        <input
          className={styles.input}
          style={fieldStyle}
          value={value}
          placeholder={placeholder}
          aria-label={label}
          onFocus={() => setOpen(true)}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpen(false);
          }}
        />
        {options.length > 0 ? (
          <button
            type="button"
            className={styles.toggle}
            aria-label={`Chọn ${label}`}
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
          >
            ▾
          </button>
        ) : null}
      </div>

      {open && options.length > 0 ? (
        <ul className={styles.menu} role="listbox" aria-label={label}>
          {options.map((option) => {
            const optionColor = tagColor(option);
            const selected = option.trim().toLowerCase() === current;
            return (
              <li key={option}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={selected ? `${styles.option} ${styles.optionSelected}` : styles.option}
                  style={
                    optionColor
                      ? {
                          background: optionColor.background,
                          borderColor: optionColor.border,
                          color: optionColor.text,
                        }
                      : undefined
                  }
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                >
                  {option}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

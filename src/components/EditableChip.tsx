import { useState } from 'react';
import styles from './EditableChip.module.css';

export type ChipOptionGroup = {
  /** Nhãn nhóm trong dropdown, ví dụ tên danh mục */
  label: string;
  options: { value: string; label: string }[];
};

type Props = {
  /** Nhãn vai trò hiển thị phía trên, ví dụ "Đồ dùng nhà bếp" hoặc "Nhân vật" */
  role: string;
  /** Nhãn đang hiển thị khi ở chế độ chọn */
  selectedValue: string;
  groups: ChipOptionGroup[];
  onSelect: (value: string) => void;
  /** Text tự do; null nghĩa là đang dùng lựa chọn từ danh sách */
  overrideText: string | null;
  onOverrideChange: (text: string) => void;
  /** Màu viền phân biệt vai trò */
  variant?: 'secondary' | 'character';
};

const VIETNAMESE_DIACRITICS =
  /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;

/**
 * Một mảnh ý tưởng có thể đổi: chọn từ danh sách hoặc gõ text tự do.
 * Text tự do chỉ sống trong phiên, không ghi vào file dữ liệu.
 */
export function EditableChip({
  role,
  selectedValue,
  groups,
  onSelect,
  overrideText,
  onOverrideChange,
  variant,
}: Props) {
  const isCustom = overrideText !== null;
  const [draft, setDraft] = useState(overrideText ?? '');

  const variantClass =
    variant === 'secondary'
      ? styles.chipSecondary
      : variant === 'character'
        ? styles.chipCharacter
        : '';

  function switchToCustom() {
    setDraft(overrideText ?? '');
    onOverrideChange(draft || ' ');
  }

  function switchToSelect() {
    onOverrideChange('');
  }

  return (
    <div className={`${styles.chip} ${variantClass}`}>
      <div className={styles.head}>
        <span className={styles.role}>{role}</span>
        <button
          type="button"
          className={styles.modeToggle}
          onClick={isCustom ? switchToSelect : switchToCustom}
        >
          {isCustom ? 'Chọn từ danh sách' : 'Tự nhập'}
        </button>
      </div>

      {isCustom ? (
        <>
          <input
            className={styles.input}
            value={draft}
            placeholder="Gõ tiếng Anh, ví dụ: a rusty steam locomotive"
            onChange={(event) => {
              setDraft(event.target.value);
              onOverrideChange(event.target.value);
            }}
            autoFocus
          />
          {VIETNAMESE_DIACRITICS.test(draft) ? (
            <span className={styles.hint}>
              Có dấu tiếng Việt — Gemini cho kết quả tốt hơn với prompt tiếng Anh.
            </span>
          ) : null}
        </>
      ) : (
        <select
          className={styles.select}
          value={selectedValue}
          onChange={(event) => onSelect(event.target.value)}
        >
          {groups.map((group) =>
            groups.length === 1 ? (
              group.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            ) : (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ),
          )}
        </select>
      )}
    </div>
  );
}

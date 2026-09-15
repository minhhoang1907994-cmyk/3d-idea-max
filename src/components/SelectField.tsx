import styles from './SelectField.module.css';

type Option = { id: string; label: string };

type Props = {
  label: string;
  value: string;
  options: readonly Option[];
  onChange: (id: string) => void;
  /** Ghi chú nhỏ dưới selectbox, ví dụ: axis này ảnh hưởng thông số in nào */
  hint?: string;
  /**
   * Có hai prop này thì field cho phép gõ text tự do thay cho chọn từ danh sách.
   * `overrideText === null` nghĩa là đang dùng lựa chọn từ danh sách.
   * Cùng cơ chế với EditableChip ở phần "Ý tưởng này ghép từ".
   */
  overrideText?: string | null;
  onOverrideChange?: (text: string) => void;
};

const VIETNAMESE_DIACRITICS =
  /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;

export function SelectField({
  label,
  value,
  options,
  onChange,
  hint,
  overrideText,
  onOverrideChange,
}: Props) {
  const editable = typeof onOverrideChange === 'function';
  const isCustom = editable && overrideText !== null && overrideText !== undefined;

  return (
    <label className={styles.field}>
      <span className={styles.labelRow}>
        <span className={styles.label}>{label}</span>
        {editable ? (
          <button
            type="button"
            className={styles.modeToggle}
            // Khoảng trắng để chuyển sang chế độ tự nhập mà chưa có chữ nào —
            // chuỗi rỗng là tín hiệu quay về dùng danh sách.
            onClick={() => onOverrideChange(isCustom ? '' : ' ')}
          >
            {isCustom ? 'Chọn từ danh sách' : 'Tự nhập'}
          </button>
        ) : null}
      </span>

      {isCustom ? (
        <input
          className={styles.input}
          value={overrideText}
          placeholder="Gõ tiếng Anh, ví dụ: sitting on a tiny stool"
          onChange={(event) => onOverrideChange(event.target.value)}
        />
      ) : (
        <select
          className={styles.select}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      )}

      {isCustom && VIETNAMESE_DIACRITICS.test(overrideText) ? (
        <span className={styles.warn}>
          Có dấu tiếng Việt — Gemini cho kết quả tốt hơn với prompt tiếng Anh.
        </span>
      ) : null}
      {hint ? <span className={styles.hint}>{hint}</span> : null}
    </label>
  );
}

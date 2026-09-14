import styles from './SelectField.module.css';

type Option = { id: string; label: string };

type Props = {
  label: string;
  value: string;
  options: readonly Option[];
  onChange: (id: string) => void;
  /** Ghi chú nhỏ dưới selectbox, ví dụ: axis này ảnh hưởng thông số in nào */
  hint?: string;
};

export function SelectField({ label, value, options, onChange, hint }: Props) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
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
      {hint ? <span className={styles.hint}>{hint}</span> : null}
    </label>
  );
}

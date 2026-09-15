import styles from './PrintabilityToggle.module.css';

type Props = {
  value: boolean;
  onChange: (value: boolean) => void;
};

/**
 * Núm điều khiển thứ hai, tách khỏi Mức sáng tạo.
 * Mức sáng tạo quyết định độ táo bạo của ý tưởng; núm này quyết định ràng buộc hình học.
 * Trước đây hai thứ bị gộp làm một nên từ mức Lai ghép trở lên là mất sạch ràng buộc in được.
 */
export function PrintabilityToggle({ value, onChange }: Props) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.head}>
        <span className={styles.title}>Ràng buộc in được</span>
        <label className={styles.switch}>
          <input
            type="checkbox"
            className={styles.input}
            checked={value}
            onChange={(event) => onChange(event.target.checked)}
          />
          <span className={styles.state}>{value ? 'Bật' : 'Tắt'}</span>
        </label>
      </div>

      <p className={styles.description}>
        {value
          ? 'Prompt yêu cầu Gemini vẽ vật thể liền khối, đế phẳng, overhang tối đa 45°, chi tiết mảnh nhất vẫn đủ dày để in.'
          : 'Gemini tự do về hình dạng — ảnh thường đẹp hơn, nhưng mô hình dựng ra dễ có chi tiết mảnh, bộ phận lơ lửng và overhang không in nổi.'}
      </p>
    </div>
  );
}

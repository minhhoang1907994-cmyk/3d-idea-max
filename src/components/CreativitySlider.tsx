import type { CreativityLevel } from '../types';
import styles from './CreativitySlider.module.css';

type Props = {
  value: CreativityLevel;
  onChange: (level: CreativityLevel) => void;
};

const LEVELS: { level: CreativityLevel; label: string; description: string }[] = [
  { level: 1, label: 'An toàn', description: 'Một sản phẩm quen thuộc, chỉ đổi phong cách' },
  { level: 2, label: 'Thú vị', description: 'Thêm một cơ chế in 3D (khớp động, nam châm...)' },
  { level: 3, label: 'Lai ghép', description: 'Ghép hai sản phẩm khác danh mục với nhau' },
  {
    level: 4,
    label: 'Đột phá',
    description: 'Lai hai lĩnh vực xa nhau, thêm nhân vật và cá nhân hóa',
  },
];

export function CreativitySlider({ value, onChange }: Props) {
  const current = LEVELS.find((item) => item.level === value) ?? LEVELS[0];

  return (
    <div className={styles.wrapper}>
      <div className={styles.head}>
        <span className={styles.title}>Mức sáng tạo</span>
        <span className={styles.currentLabel}>{current?.label}</span>
      </div>

      <div className={styles.steps} role="group" aria-label="Mức sáng tạo">
        {LEVELS.map((item) => (
          <button
            key={item.level}
            type="button"
            className={item.level === value ? `${styles.step} ${styles.stepActive}` : styles.step}
            onClick={() => onChange(item.level)}
            aria-pressed={item.level === value}
            title={item.description}
          >
            {item.label}
          </button>
        ))}
      </div>

      <p className={styles.description}>{current?.description}</p>
    </div>
  );
}

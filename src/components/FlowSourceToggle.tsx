import type { FlowPromptSource } from '../types';
import styles from './FlowSourceToggle.module.css';

type Props = {
  value: FlowPromptSource;
  onChange: (value: FlowPromptSource) => void;
};

const OPTIONS: { id: FlowPromptSource; label: string; description: string }[] = [
  {
    id: 'text',
    label: 'Từ text',
    description:
      'Gõ thẳng prompt vào Flow. Model tự dựng cả vật thể lẫn bốn góc nhìn — tiện nhưng prompt dài, dễ bị bỏ sót ràng buộc.',
  },
  {
    id: 'image',
    label: 'Từ ảnh Gemini',
    description:
      'Sinh ảnh bằng prompt phía trên trước, đưa ảnh đó vào Flow. Hình dạng đã bị ảnh khoá nên bốn góc bám nhau sát hơn.',
  },
];

/** Hai cách dựng ảnh nhiều góc ở Flow — xem lib/buildFlowPrompt.ts */
export function FlowSourceToggle({ value, onChange }: Props) {
  const current = OPTIONS.find((option) => option.id === value) ?? OPTIONS[0];

  return (
    <div className={styles.wrapper}>
      <div className={styles.steps} role="group" aria-label="Đầu vào cho ảnh nhiều góc ở Flow">
        {OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={option.id === value ? `${styles.step} ${styles.stepActive}` : styles.step}
            onClick={() => onChange(option.id)}
            aria-pressed={option.id === value}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className={styles.description}>{current?.description}</p>
    </div>
  );
}

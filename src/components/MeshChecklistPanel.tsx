import type { MeshCheckItem } from '../types';
import styles from './MeshChecklistPanel.module.css';

type Props = { items: MeshCheckItem[] };

/**
 * Khâu ảnh → STL nằm ngoài app: prompt không kiểm soát được mesh mà tool image→3D dựng ra.
 * Liệt kê rõ từng bước thay vì để user phát hiện lỗi sau khi đã tốn vài giờ máy chạy.
 */
export function MeshChecklistPanel({ items }: Props) {
  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <h2 className={styles.title}>Sau khi có file STL</h2>
        <p className={styles.subtitle}>
          Những lỗi dưới đây sinh ra ở khâu dựng mesh từ ảnh, prompt không chặn được — kiểm tay
          trước khi bấm in.
        </p>
      </header>

      <ol className={styles.list}>
        {items.map((item) => (
          <li key={item.id} className={styles.item}>
            <div className={styles.itemHead}>
              <span className={styles.label}>{item.label}</span>
              {item.level === 'conditional' ? <span className={styles.badge}>khi cần</span> : null}
            </div>
            <p className={styles.risk}>{item.risk}</p>
            <p className={styles.tool}>{item.tool}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
